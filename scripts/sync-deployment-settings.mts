#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type JsonObject = Record<string, unknown>;
type Classification = 'variable' | 'secret';
type ValueType = 'string' | 'int' | 'bool';
type RequiredWhen = 'always' | 'deploy_infra' | 'existing_infra' | 'never';
type EmitWhen = 'always' | 'nonEmpty';

interface DeploymentSetting {
  id: string;
  githubName: string;
  appServiceName: string;
  description: string;
  classification: Classification;
  valueType: ValueType;
  requiredWhen: RequiredWhen;
  emitWhen?: EmitWhen;
  defaultValue?: string;
}

interface DeploymentSettingsContract {
  version: 1;
  settings: DeploymentSetting[];
}

interface DeploymentSettingsOverlay {
  version: 1;
  disabled: string[];
  overrides: Record<string, JsonObject>;
  additions: JsonObject[];
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const overlayPath = path.join(repoRoot, 'infrastructure/azure/deployment-settings.json');
const defaultsPath = path.join(repoRoot, 'infrastructure/azure/deployment-settings-defaults.json');

const generatedTargets = [
  '.github/workflows/deploy-azure-appservice.yml',
  '.github/workflows/ci-cd.yml',
  'infrastructure/azure/deploy.sh',
];

const allowedClassifications = new Set(['variable', 'secret']);
const allowedValueTypes = new Set(['string', 'int', 'bool']);
const allowedRequiredWhen = new Set(['always', 'deploy_infra', 'existing_infra', 'never']);
const allowedEmitWhen = new Set(['always', 'nonEmpty']);
const allowedOverrideKeys = new Set([
  'classification',
  'valueType',
  'description',
  'requiredWhen',
  'emitWhen',
  'appServiceName',
  'defaultValue',
]);

function fail(message: string): never {
  throw new Error(message);
}

function assertString(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || value.length === 0) {
    fail(`${label} must be a non-empty string.`);
  }
}

function assertPlainObject(value: unknown, label: string): asserts value is JsonObject {
  if (!isPlainObject(value)) {
    fail(`${label} must be an object.`);
  }
}

function isPlainObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function deepMerge(base: unknown, overlay: unknown): unknown {
  if (!isPlainObject(base) || !isPlainObject(overlay)) {
    return clone(overlay);
  }

  const result: JsonObject = clone(base);
  for (const [key, value] of Object.entries(overlay)) {
    result[key] = key in result ? deepMerge(result[key], value) : clone(value);
  }
  return result;
}

function githubNameToId(githubName: string): string {
  return githubName.toLowerCase().replace(/_+/g, '-');
}

function shellQuote(value: string): string {
  return String(value).replaceAll("'", "'\"'\"'");
}

function yamlQuotedString(value: string): string {
  return JSON.stringify(value);
}

function githubExpressionString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function envReference(setting: DeploymentSetting): string {
  return setting.defaultValue === undefined
    ? `\${${setting.githubName}:-}`
    : `\${${setting.githubName}:-${setting.defaultValue}}`;
}

function replaceBlock(content: string, id: string, generatedLines: string[]): string {
  const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(^[ \\t]*)# <deployment-settings:${escapedId}>\\n[\\s\\S]*?^[ \\t]*# </deployment-settings:${escapedId}>`, 'm');
  const match = content.match(pattern);

  if (!match) {
    fail(`Missing generated block marker for ${id}.`);
  }

  const indent = match[1] ?? '';
  const body = generatedLines.map((line) => (line.length === 0 ? '' : `${indent}${line}`)).join('\n');
  const replacement = [`${indent}# <deployment-settings:${id}>`, body, `${indent}# </deployment-settings:${id}>`]
    .filter((line) => line !== '')
    .join('\n');

  return content.replace(match[0], replacement);
}

function sortSettings(settings: DeploymentSetting[]): DeploymentSetting[] {
  return [...settings].sort((left, right) => left.githubName.localeCompare(right.githubName));
}

function validateSettingsArrayContract(contract: unknown, label: string): asserts contract is { settings: unknown[] } {
  assertPlainObject(contract, label);
  if (!Array.isArray(contract.settings)) {
    fail(`${label} must contain a settings array.`);
  }
}

function validateContract(contract: unknown): asserts contract is DeploymentSettingsContract {
  validateSettingsArrayContract(contract, 'Resolved deployment settings');

  const githubNames = new Map<string, string>();
  const appServiceNames = new Map<string, string>();

  for (const setting of contract.settings) {
    assertPlainObject(setting, 'setting');
    assertString(setting.id, 'setting.id');
    assertString(setting.githubName, `${setting.id}.githubName`);
    assertString(setting.appServiceName, `${setting.githubName}.appServiceName`);
    assertString(setting.description, `${setting.githubName}.description`);

    if (typeof setting.classification !== 'string' || !allowedClassifications.has(setting.classification)) {
      fail(`${setting.githubName} has invalid classification '${setting.classification}'.`);
    }

    if (typeof setting.valueType !== 'string' || !allowedValueTypes.has(setting.valueType)) {
      fail(`${setting.githubName} has invalid valueType '${setting.valueType}'.`);
    }

    if (typeof setting.requiredWhen !== 'string' || !allowedRequiredWhen.has(setting.requiredWhen)) {
      fail(`${setting.githubName} has invalid requiredWhen '${setting.requiredWhen}'.`);
    }

    if (!/^[A-Z][A-Z0-9_]*$/.test(setting.githubName)) {
      fail(`${setting.githubName} must use upper snake case.`);
    }

    const emitWhen = setting.emitWhen ?? 'nonEmpty';
    if (typeof emitWhen !== 'string' || !allowedEmitWhen.has(emitWhen)) {
      fail(`${setting.githubName} has invalid emitWhen '${emitWhen}'.`);
    }

    if (setting.defaultValue !== undefined && typeof setting.defaultValue !== 'string') {
      fail(`${setting.githubName} has invalid defaultValue; defaultValue must be a string.`);
    }

    if (githubNames.has(setting.githubName)) {
      fail(`Duplicate GitHub setting name '${setting.githubName}' in ${githubNames.get(setting.githubName)} and ${setting.id}.`);
    }
    githubNames.set(setting.githubName, setting.id);

    if (appServiceNames.has(setting.appServiceName)) {
      fail(`Duplicate App Service setting name '${setting.appServiceName}' in ${appServiceNames.get(setting.appServiceName)} and ${setting.id}.`);
    }
    appServiceNames.set(setting.appServiceName, setting.id);
  }
}

function validateOverlay(overlay: unknown, defaults: DeploymentSettingsContract): asserts overlay is DeploymentSettingsOverlay {
  assertPlainObject(overlay, 'deployment-settings.json');

  if (overlay.version !== 1) {
    fail('deployment-settings.json version must be 1.');
  }

  if (!Array.isArray(overlay.disabled)) {
    fail('deployment-settings.json disabled must be an array.');
  }

  assertPlainObject(overlay.overrides, 'deployment-settings.json overrides');

  if (!Array.isArray(overlay.additions)) {
    fail('deployment-settings.json additions must be an array.');
  }

  const defaultSettings = new Map(defaults.settings.map((setting) => [setting.githubName, setting]));
  const seenDisabled = new Set<string>();

  for (const githubName of overlay.disabled) {
    assertString(githubName, 'deployment-settings.json disabled entry');
    if (seenDisabled.has(githubName)) {
      fail(`deployment-settings.json disables ${githubName} more than once.`);
    }
    seenDisabled.add(githubName);
    if (!defaultSettings.has(githubName)) {
      fail(`deployment-settings.json disables unknown default setting ${githubName}.`);
    }
  }

  for (const [githubName, override] of Object.entries(overlay.overrides)) {
    if (!defaultSettings.has(githubName)) {
      fail(`deployment-settings.json overrides unknown default setting ${githubName}.`);
    }

    if (seenDisabled.has(githubName)) {
      fail(`deployment-settings.json cannot both disable and override ${githubName}.`);
    }

    assertPlainObject(override, `deployment-settings.json overrides.${githubName}`);
    for (const key of Object.keys(override)) {
      if (key === 'id' || key === 'githubName') {
        fail(`deployment-settings.json overrides.${githubName} cannot change id or githubName; use additions for new settings.`);
      }

      if (!allowedOverrideKeys.has(key)) {
        fail(
          `deployment-settings.json overrides.${githubName} cannot use unsupported property '${key}'; permitted keys are classification, valueType, description, requiredWhen, emitWhen, appServiceName, and defaultValue.`,
        );
      }
    }
  }

  for (const [index, addition] of overlay.additions.entries()) {
    assertPlainObject(addition, `deployment-settings.json additions[${index}]`);
  }
}

function normalizeAddition(addition: JsonObject): DeploymentSetting {
  const normalized = clone(addition);
  assertString(normalized.githubName, 'addition.githubName');

  normalized.id ??= githubNameToId(normalized.githubName);
  normalized.requiredWhen ??= 'never';
  normalized.emitWhen ??= 'nonEmpty';

  return normalized as unknown as DeploymentSetting;
}

function validateAdditionCollisions(defaults: DeploymentSettingsContract, additions: DeploymentSetting[]): void {
  const defaultGithubNames = new Set(defaults.settings.map((setting) => setting.githubName));
  const defaultAppServiceNames = new Set(defaults.settings.map((setting) => setting.appServiceName));

  const addedGithubNames = new Set<string>();
  const addedAppServiceNames = new Set<string>();

  for (const addition of additions) {
    if (defaultGithubNames.has(addition.githubName)) {
      fail(`${addition.githubName} is already defined by deployment-settings-defaults.json; use overrides or disabled instead.`);
    }

    if (addedGithubNames.has(addition.githubName)) {
      fail(`Duplicate added GitHub setting name '${addition.githubName}'.`);
    }
    addedGithubNames.add(addition.githubName);

    if (defaultAppServiceNames.has(addition.appServiceName)) {
      fail(`${addition.githubName} uses App Service setting '${addition.appServiceName}' already defined by deployment-settings-defaults.json.`);
    }

    if (addedAppServiceNames.has(addition.appServiceName)) {
      fail(`Duplicate added App Service setting name '${addition.appServiceName}'.`);
    }
    addedAppServiceNames.add(addition.appServiceName);
  }
}

function resolveSettings(defaults: unknown, overlay: unknown): DeploymentSettingsContract {
  validateSettingsArrayContract(defaults, 'deployment-settings-defaults.json');
  validateContract(defaults);
  validateOverlay(overlay, defaults);

  const disabled = new Set(overlay.disabled);
  const settings = defaults.settings
    .filter((setting) => !disabled.has(setting.githubName))
    .map((setting) => deepMerge(setting, overlay.overrides[setting.githubName] ?? {}) as DeploymentSetting);
  const additions = overlay.additions.map(normalizeAddition);

  validateAdditionCollisions(defaults, additions);

  const resolved = {
    version: 1,
    settings: [...settings, ...additions],
  };
  validateContract(resolved);
  return resolved;
}

function contractSettings(contract: DeploymentSettingsContract): DeploymentSetting[] {
  return sortSettings(contract.settings);
}

function secretSettings(settings: DeploymentSetting[]): DeploymentSetting[] {
  return settings.filter((setting) => setting.classification === 'secret');
}

function requiredSettings(settings: DeploymentSetting[], requiredWhen: RequiredWhen): DeploymentSetting[] {
  return settings.filter((setting) => setting.requiredWhen === requiredWhen);
}

function renderWorkflowSecrets(settings: DeploymentSetting[]): string[] {
  return secretSettings(settings).flatMap((setting) => [
    `${setting.githubName}:`,
    `  description: ${yamlQuotedString(setting.description)}`,
    '  required: false',
  ]);
}

function renderWorkflowEnv(settings: DeploymentSetting[]): string[] {
  return settings.map((setting) => {
    const source = setting.classification === 'secret' ? `secrets.${setting.githubName}` : `vars.${setting.githubName}`;
    const expression =
      setting.defaultValue === undefined ? source : `${source} || ${githubExpressionString(setting.defaultValue)}`;
    return `${setting.githubName}: \${{ ${expression} }}`;
  });
}

function renderWorkflowRequiredChecks(settings: DeploymentSetting[]): string[] {
  const lines: string[] = [];
  const deployInfraSettings = requiredSettings(settings, 'deploy_infra');
  const existingInfraSettings = requiredSettings(settings, 'existing_infra');
  const alwaysSettings = requiredSettings(settings, 'always');

  for (const setting of alwaysSettings) {
    lines.push(`if [[ -z "$${setting.githubName}" ]]; then`);
    lines.push(`  echo "${setting.githubName} must be configured as a GitHub Environment ${setting.classification}."`);
    lines.push('  exit 1');
    lines.push('fi');
    lines.push('');
  }

  for (const setting of deployInfraSettings) {
    lines.push(`if [[ "\${{ inputs.deploy_infra }}" == "true" && -z "$${setting.githubName}" ]]; then`);
    lines.push(`  echo "${setting.githubName} must be configured as a GitHub Environment ${setting.classification} when deploy_infra is true."`);
    lines.push('  exit 1');
    lines.push('fi');
    lines.push('');
  }

  for (const setting of existingInfraSettings) {
    lines.push(`if [[ "\${{ inputs.deploy_infra }}" != "true" && -z "$${setting.githubName}" ]]; then`);
    lines.push(`  echo "${setting.githubName} must be configured as a GitHub Environment ${setting.classification} when deploy_infra is false."`);
    lines.push('  exit 1');
    lines.push('fi');
    lines.push('');
  }

  return lines.length > 0 ? lines.slice(0, -1) : ['# No generated required deployment setting checks.'];
}

function renderWorkflowRuntimeSettings(settings: DeploymentSetting[]): string[] {
  return settings.map((setting) => {
    if ((setting.emitWhen ?? 'nonEmpty') === 'always') {
      return `settings+=("${setting.appServiceName}=$${setting.githubName}")`;
    }

    return `add_setting "${setting.appServiceName}" "$${setting.githubName}"`;
  });
}

function renderWorkflowDisabledSettings(settings: DeploymentSetting[]): string[] {
  return [
    'disabled_settings=(',
    ...settings.map((setting) => `  "${setting.appServiceName}"`),
    ')',
    '',
    'if (( ${#disabled_settings[@]} > 0 )); then',
    '  az webapp config appsettings delete \\',
    '    --resource-group "$RESOURCE_GROUP" \\',
    '    --name "$WEB_APP_NAME" \\',
    '    --setting-names "${disabled_settings[@]}" \\',
    '    --output none',
    'fi',
    '',
  ];
}

function renderCiCdSecrets(settings: DeploymentSetting[]): string[] {
  return secretSettings(settings).map((setting) => `${setting.githubName}: \${{ secrets.${setting.githubName} }}`);
}

function wrapNames(names: string[]): string[] {
  const lines: string[] = [];
  let current = '  ';
  for (const name of names) {
    const next = current.trim().length === 0 ? name : `${current.trimEnd()}${current.trim().length > 0 ? ', ' : ''}${name}`;
    if (next.length > 82 && current.trim().length > 0) {
      lines.push(current.trimEnd());
      current = `  ${name}`;
    } else {
      current = next;
    }
  }
  if (current.trim().length > 0) {
    lines.push(current.trimEnd());
  }
  return lines;
}

function renderDeployShHelp(settings: DeploymentSetting[]): string[] {
  const helpLines = [
    'Deployment settings overlay: infrastructure/azure/deployment-settings.json',
    'Template defaults: infrastructure/azure/deployment-settings-defaults.json',
    ...wrapNames(settings.map((setting) => setting.githubName)),
  ];
  return [
    "printf '%s\\n' \\",
    ...helpLines.map((line, index) => {
      const suffix = index === helpLines.length - 1 ? '' : ' \\';
      return `  '${shellQuote(line)}'${suffix}`;
    }),
  ];
}

function renderDeployShRequiredChecks(settings: DeploymentSetting[]): string[] {
  const lines: string[] = [];
  for (const setting of requiredSettings(settings, 'always')) {
    lines.push(`[[ -n "\${${setting.githubName}:-}" ]] || die "${setting.githubName} is required."`);
  }

  for (const setting of requiredSettings(settings, 'deploy_infra')) {
    lines.push(`if is_true "$DEPLOY_INFRA"; then`);
    lines.push(`  [[ -n "\${${setting.githubName}:-}" ]] || die "${setting.githubName} is required when DEPLOY_INFRA=true."`);
    lines.push('fi');
  }

  for (const setting of requiredSettings(settings, 'existing_infra')) {
    lines.push(`if ! is_true "$DEPLOY_INFRA"; then`);
    lines.push(`  [[ -n "\${${setting.githubName}:-}" ]] || die "${setting.githubName} is required when DEPLOY_INFRA=false."`);
    lines.push('fi');
  }

  return lines.length > 0 ? lines : ['# No generated required deployment setting checks.'];
}

function renderDeployShRuntimeSettings(settings: DeploymentSetting[]): string[] {
  return settings.map((setting) => {
    const reference = envReference(setting);
    if ((setting.emitWhen ?? 'nonEmpty') === 'always') {
      return `app_settings+=("${setting.appServiceName}=${reference}")`;
    }

    return `add_setting "${setting.appServiceName}" "${reference}"`;
  });
}

function renderDeployShDisabledSettings(settings: DeploymentSetting[]): string[] {
  return [
    'disabled_settings=(',
    ...settings.map((setting) => `  "${setting.appServiceName}"`),
    ')',
    '',
    'if (( ${#disabled_settings[@]} > 0 )); then',
    '  az webapp config appsettings delete \\',
    '    --resource-group "$RESOURCE_GROUP" \\',
    '    --name "$WEB_APP_NAME" \\',
    '    --setting-names "${disabled_settings[@]}" \\',
    '    --output none',
    'fi',
    '',
  ];
}

function renderFile(
  relativePath: string,
  originalContent: string,
  settings: DeploymentSetting[],
  disabledSettings: DeploymentSetting[],
): string {
  let content = originalContent;

  switch (relativePath) {
    case '.github/workflows/deploy-azure-appservice.yml':
      content = replaceBlock(content, 'workflow-secrets', renderWorkflowSecrets(settings));
      content = replaceBlock(content, 'workflow-env', renderWorkflowEnv(settings));
      content = replaceBlock(content, 'workflow-required-checks', renderWorkflowRequiredChecks(settings));
      content = replaceBlock(content, 'workflow-runtime-settings', [
        ...renderWorkflowDisabledSettings(disabledSettings),
        ...renderWorkflowRuntimeSettings(settings),
      ]);
      return content;
    case '.github/workflows/ci-cd.yml':
      content = replaceBlock(content, 'ci-cd-deploy-test-secrets', renderCiCdSecrets(settings));
      content = replaceBlock(content, 'ci-cd-deploy-manual-secrets', renderCiCdSecrets(settings));
      return content;
    case 'infrastructure/azure/deploy.sh':
      content = replaceBlock(content, 'deploy-sh-help', renderDeployShHelp(settings));
      content = replaceBlock(content, 'deploy-sh-required-checks', renderDeployShRequiredChecks(settings));
      content = replaceBlock(content, 'deploy-sh-runtime-settings', [
        ...renderDeployShDisabledSettings(disabledSettings),
        ...renderDeployShRuntimeSettings(settings),
      ]);
      return content;
    default:
      fail(`No renderer configured for ${relativePath}.`);
  }
}

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  const write = args.has('--write');
  const check = args.has('--check');

  if (write === check) {
    fail('Specify exactly one of --write or --check.');
  }

  const defaults = JSON.parse(await readFile(defaultsPath, 'utf8'));
  const overlay = JSON.parse(await readFile(overlayPath, 'utf8'));
  const contract = resolveSettings(defaults, overlay);
  const settings = contractSettings(contract);
  const defaultSettings = new Map(contractSettings(defaults).map((setting) => [setting.githubName, setting]));
  const disabledSettings = overlay.disabled.map((githubName: string) => {
    const setting = defaultSettings.get(githubName);
    if (setting === undefined) {
      fail(`deployment-settings.json disables unknown default setting ${githubName}.`);
    }
    return setting;
  });
  const staleFiles: string[] = [];

  for (const relativePath of generatedTargets) {
    const fullPath = path.join(repoRoot, relativePath);
    const originalContent = await readFile(fullPath, 'utf8');
    const renderedContent = renderFile(relativePath, originalContent, settings, disabledSettings);

    if (renderedContent !== originalContent) {
      staleFiles.push(relativePath);
      if (write) {
        await writeFile(fullPath, renderedContent, 'utf8');
      }
    }
  }

  if (check && staleFiles.length > 0) {
    fail(`Generated deployment setting regions are stale:\n${staleFiles.map((file) => `  - ${file}`).join('\n')}\nRun npm run deployment-settings:sync.`);
  }

  const action = write ? 'Synchronized' : 'Validated';
  console.log(`${action} deployment settings for ${settings.length} setting(s).`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`deployment-settings: ${message}`);
  process.exit(1);
});
