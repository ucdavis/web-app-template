#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Deploy the web app to Azure App Service.

Usage:
  infrastructure/azure/deploy.sh <test|prod>
  infrastructure/azure/deploy_test.sh
  infrastructure/azure/deploy_prod.sh

Required for infrastructure deployments:
  SQL_ADMIN_PASSWORD     SQL admin password used by Azure SQL.

Common configuration:
  APP_NAME               Base Azure resource name. Default: webapp
  AZURE_SUBSCRIPTION_ID  Expected subscription. Default: current az account
  AZURE_LOCATION         Azure region used when creating the resource group. Default: westus2
  RESOURCE_GROUP         Target resource group. Default: rg-${APP_NAME}-${DEPLOY_ENV}
  DEPLOY_INFRA           Deploy infrastructure before app deploy. Default: true
  BUILD_APP              Restore, build, test, publish, and package locally. Default: true
  RUN_TESTS              Run frontend and .NET tests during BUILD_APP. Default: true

Existing infrastructure deployments:
  DEPLOY_INFRA=false WEB_APP_NAME=<app-service-name> infrastructure/azure/deploy.sh test

Optional app settings use the same names as the GitHub Environment variables:
  AUTH_CLIENT_ID, AUTH_TENANT_ID, AUTH_DOMAIN, AUTH_INSTANCE, AUTH_CALLBACK_PATH,
  NOTIFICATION_BASE_URL, NOTIFICATION_DEFAULT_APP_NAME, NOTIFICATION_DEFAULT_BUTTON_TEXT,
  SMTP_HOST, SMTP_PORT, SMTP_TIMEOUT, SMTP_USE_SSL, SMTP_USERNAME, SMTP_PASSWORD,
  SMTP_FROM_EMAIL, SMTP_FROM_NAME, SMTP_REPLY_TO_EMAIL, SMTP_BCC_EMAIL,
  OTLP_EXPORTER_ENDPOINT, OTLP_EXPORTER_PROTOCOL, OTEL_EXPORTER_OTLP_HEADERS,
  OTEL_SERVICE_NAME, OTEL_RESOURCE_ATTRIBUTES, DB_CONNECTION
USAGE
}

die() {
  printf 'error: %s\n' "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "Required command '$1' was not found."
}

is_true() {
  case "${1:-}" in
    true|TRUE|True|1|yes|YES|Yes) return 0 ;;
    false|FALSE|False|0|no|NO|No|'') return 1 ;;
    *) die "Expected a boolean value, got '$1'." ;;
  esac
}

lower() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]'
}

add_param() {
  local name="$1"
  local value="${2:-}"

  if [[ -n "$value" ]]; then
    deployment_params+=("$name=$value")
  fi
}

add_setting() {
  local name="$1"
  local value="${2:-}"

  if [[ -n "$value" ]]; then
    app_settings+=("$name=$value")
  fi
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ $# -gt 0 ]]; then
  DEPLOY_ENV="$1"
  shift
fi

if [[ $# -gt 0 ]]; then
  usage
  die "Unexpected argument(s): $*"
fi

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/../.." && pwd)"

DEPLOY_ENV="${DEPLOY_ENV:-}"
APP_NAME="${APP_NAME:-webapp}"
AZURE_LOCATION="${AZURE_LOCATION:-westus2}"
RESOURCE_GROUP="${RESOURCE_GROUP:-rg-${APP_NAME}-${DEPLOY_ENV}}"
DEPLOY_INFRA="${DEPLOY_INFRA:-true}"
BUILD_APP="${BUILD_APP:-true}"
RUN_TESTS="${RUN_TESTS:-true}"
SQL_ADMIN_LOGIN="${SQL_ADMIN_LOGIN:-sqladmin}"
PUBLISH_ROOT="${PUBLISH_ROOT:-$repo_root/publish}"
PUBLISH_WEB_DIR="${PUBLISH_WEB_DIR:-$PUBLISH_ROOT/web}"
PACKAGE_PATH="${PACKAGE_PATH:-$PUBLISH_ROOT/webapp.zip}"

case "$DEPLOY_ENV" in
  test|prod) ;;
  *) usage; die "DEPLOY_ENV must be either 'test' or 'prod'." ;;
esac

resource_group_lower="$(lower "$RESOURCE_GROUP")"
expected_suffix="-$DEPLOY_ENV"
if [[ "$resource_group_lower" != *"$expected_suffix" ]]; then
  die "RESOURCE_GROUP must end with '$expected_suffix' for '$DEPLOY_ENV' deployments."
fi

require_command az

if is_true "$DEPLOY_INFRA"; then
  [[ -n "${SQL_ADMIN_PASSWORD:-}" ]] || die "SQL_ADMIN_PASSWORD is required when DEPLOY_INFRA=true."
else
  [[ -n "${WEB_APP_NAME:-}" ]] || die "WEB_APP_NAME is required when DEPLOY_INFRA=false."
fi

if is_true "$BUILD_APP"; then
  require_command npm
  require_command dotnet
  require_command zip
elif [[ ! -f "$PACKAGE_PATH" ]]; then
  die "BUILD_APP=false requires an existing package at PACKAGE_PATH: $PACKAGE_PATH"
fi

if [[ -n "${AZURE_SUBSCRIPTION_ID:-}" ]]; then
  az account set --subscription "$AZURE_SUBSCRIPTION_ID"
fi

CURRENT_SUBSCRIPTION_ID="$(az account show --query id --output tsv)"
AZURE_SUBSCRIPTION_ID="${AZURE_SUBSCRIPTION_ID:-$CURRENT_SUBSCRIPTION_ID}"

if [[ "$(lower "$CURRENT_SUBSCRIPTION_ID")" != "$(lower "$AZURE_SUBSCRIPTION_ID")" ]]; then
  die "Current az account subscription '$CURRENT_SUBSCRIPTION_ID' does not match AZURE_SUBSCRIPTION_ID '$AZURE_SUBSCRIPTION_ID'."
fi

if is_true "$BUILD_APP"; then
  printf 'Building package for %s in %s...\n' "$APP_NAME" "$DEPLOY_ENV"

  npm --prefix "$repo_root/client" ci
  npm --prefix "$repo_root/client" run build

  if is_true "$RUN_TESTS"; then
    npm --prefix "$repo_root/client" test -- --run
  fi

  dotnet restore "$repo_root/app.sln"
  dotnet build "$repo_root/app.sln" --configuration Release --no-restore

  if is_true "$RUN_TESTS"; then
    dotnet test "$repo_root/app.sln" --configuration Release --no-build
  fi

  rm -rf "$PUBLISH_WEB_DIR" "$PACKAGE_PATH"
  mkdir -p "$PUBLISH_ROOT"

  dotnet publish "$repo_root/server/server.csproj" --configuration Release --output "$PUBLISH_WEB_DIR"

  (
    cd "$PUBLISH_WEB_DIR"
    zip -qr "$PACKAGE_PATH" .
  )
fi

if is_true "$DEPLOY_INFRA"; then
  printf 'Ensuring resource group %s exists in %s...\n' "$RESOURCE_GROUP" "$AZURE_LOCATION"
  az group create \
    --name "$RESOURCE_GROUP" \
    --location "$AZURE_LOCATION" \
    --tags "application=$APP_NAME" "environment=$DEPLOY_ENV" \
    --output none

  deployment_name="${APP_NAME}-${DEPLOY_ENV}-local-$(date +%Y%m%d%H%M%S)"
  deployment_params=(
    "appName=$APP_NAME"
    "env=$DEPLOY_ENV"
    "expectedSubscriptionId=$AZURE_SUBSCRIPTION_ID"
    "sqlAdminLogin=$SQL_ADMIN_LOGIN"
    "sqlAdminPassword=$SQL_ADMIN_PASSWORD"
  )

  add_param "location" "$AZURE_LOCATION"
  add_param "sqlDatabaseName" "${SQL_DATABASE_NAME:-}"
  add_param "webSkuName" "${WEB_SKU_NAME:-}"
  add_param "webSkuTier" "${WEB_SKU_TIER:-}"
  add_param "sqlSkuName" "${SQL_SKU_NAME:-}"
  add_param "sqlSkuTier" "${SQL_SKU_TIER:-}"
  add_param "notificationBaseUrl" "${NOTIFICATION_BASE_URL:-}"
  add_param "notificationDefaultAppName" "${NOTIFICATION_DEFAULT_APP_NAME:-}"
  add_param "notificationDefaultButtonText" "${NOTIFICATION_DEFAULT_BUTTON_TEXT:-}"
  add_param "authClientId" "${AUTH_CLIENT_ID:-}"
  add_param "authTenantId" "${AUTH_TENANT_ID:-}"
  add_param "authDomain" "${AUTH_DOMAIN:-}"
  add_param "authInstance" "${AUTH_INSTANCE:-}"
  add_param "authCallbackPath" "${AUTH_CALLBACK_PATH:-}"
  add_param "smtpHost" "${SMTP_HOST:-}"
  add_param "smtpPort" "${SMTP_PORT:-}"
  add_param "smtpTimeout" "${SMTP_TIMEOUT:-}"
  add_param "smtpUseSsl" "${SMTP_USE_SSL:-}"
  add_param "smtpUsername" "${SMTP_USERNAME:-}"
  add_param "smtpPassword" "${SMTP_PASSWORD:-}"
  add_param "smtpFromEmail" "${SMTP_FROM_EMAIL:-}"
  add_param "smtpFromName" "${SMTP_FROM_NAME:-}"
  add_param "smtpReplyToEmail" "${SMTP_REPLY_TO_EMAIL:-}"
  add_param "smtpBccEmail" "${SMTP_BCC_EMAIL:-}"
  add_param "otlpExporterEndpoint" "${OTLP_EXPORTER_ENDPOINT:-}"
  add_param "otlpExporterProtocol" "${OTLP_EXPORTER_PROTOCOL:-}"
  add_param "otelExporterOtlpHeaders" "${OTEL_EXPORTER_OTLP_HEADERS:-}"
  add_param "otelServiceName" "${OTEL_SERVICE_NAME:-}"
  add_param "otelResourceAttributes" "${OTEL_RESOURCE_ATTRIBUTES:-}"

  printf 'Deploying infrastructure to %s...\n' "$RESOURCE_GROUP"
  az deployment group create \
    --name "$deployment_name" \
    --resource-group "$RESOURCE_GROUP" \
    --template-file "$repo_root/infrastructure/azure/main.bicep" \
    --parameters "${deployment_params[@]}" \
    --output none

  deployment_guard_passed="$(
    az deployment group show \
      --name "$deployment_name" \
      --resource-group "$RESOURCE_GROUP" \
      --query "properties.outputs.deploymentGuardPassed.value" \
      --output tsv
  )"

  if [[ "$deployment_guard_passed" != "true" ]]; then
    die "Azure deployment guard did not pass. Check subscription ID, resource group suffix, and environment values."
  fi

  WEB_APP_NAME="$(
    az deployment group show \
      --name "$deployment_name" \
      --resource-group "$RESOURCE_GROUP" \
      --query "properties.outputs.webAppName.value" \
      --output tsv
  )"

  [[ -n "$WEB_APP_NAME" ]] || die "The infrastructure deployment did not return a webAppName output."
fi

app_settings=(
  "ASPNETCORE_ENVIRONMENT=$DEPLOY_ENV"
  "WEBSITE_RUN_FROM_PACKAGE=1"
)

add_setting "DB_CONNECTION" "${DB_CONNECTION:-}"
add_setting "Notification__BaseUrl" "${NOTIFICATION_BASE_URL:-}"
add_setting "Notification__DefaultAppName" "${NOTIFICATION_DEFAULT_APP_NAME:-}"
add_setting "Notification__DefaultButtonText" "${NOTIFICATION_DEFAULT_BUTTON_TEXT:-}"
add_setting "Auth__ClientId" "${AUTH_CLIENT_ID:-}"
add_setting "Auth__TenantId" "${AUTH_TENANT_ID:-}"
add_setting "Auth__Domain" "${AUTH_DOMAIN:-}"
add_setting "Auth__Instance" "${AUTH_INSTANCE:-}"
add_setting "Auth__CallbackPath" "${AUTH_CALLBACK_PATH:-}"
add_setting "Smtp__Host" "${SMTP_HOST:-}"
add_setting "Smtp__Port" "${SMTP_PORT:-}"
add_setting "Smtp__Timeout" "${SMTP_TIMEOUT:-}"
add_setting "Smtp__UseSsl" "${SMTP_USE_SSL:-}"
add_setting "Smtp__Username" "${SMTP_USERNAME:-}"
add_setting "Smtp__Password" "${SMTP_PASSWORD:-}"
add_setting "Smtp__FromEmail" "${SMTP_FROM_EMAIL:-}"
add_setting "Smtp__FromName" "${SMTP_FROM_NAME:-}"
add_setting "Smtp__ReplyToEmail" "${SMTP_REPLY_TO_EMAIL:-}"
add_setting "Smtp__BccEmail" "${SMTP_BCC_EMAIL:-}"
add_setting "OTEL_EXPORTER_OTLP_ENDPOINT" "${OTLP_EXPORTER_ENDPOINT:-}"
add_setting "OTEL_EXPORTER_OTLP_PROTOCOL" "${OTLP_EXPORTER_PROTOCOL:-}"
add_setting "OTEL_EXPORTER_OTLP_HEADERS" "${OTEL_EXPORTER_OTLP_HEADERS:-}"
add_setting "OTEL_SERVICE_NAME" "${OTEL_SERVICE_NAME:-}"
add_setting "OTEL_RESOURCE_ATTRIBUTES" "${OTEL_RESOURCE_ATTRIBUTES:-}"

printf 'Applying runtime settings to %s...\n' "$WEB_APP_NAME"
az webapp config appsettings set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$WEB_APP_NAME" \
  --settings "${app_settings[@]}" \
  --output none

printf 'Deploying %s to %s...\n' "$PACKAGE_PATH" "$WEB_APP_NAME"
az webapp deploy \
  --resource-group "$RESOURCE_GROUP" \
  --name "$WEB_APP_NAME" \
  --src-path "$PACKAGE_PATH" \
  --type zip \
  --output none

default_hostname="$(az webapp show --resource-group "$RESOURCE_GROUP" --name "$WEB_APP_NAME" --query defaultHostName --output tsv)"
printf 'Deployment complete: https://%s\n' "$default_hostname"
