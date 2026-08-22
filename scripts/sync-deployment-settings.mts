#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type JsonObject = Record<string, unknown>;
type Classification = 'variable' | 'secret';
type ValueType = 'string' | 'int' | 'bool';
type RequiredWhen = 'always' | 'deploy_infra' | 'existing_infra' | 'never';
type EmitWhen = 'always' | 'nonEmpty';
type BicepDefaultExpression = { expression: string };
type BicepLiteral = string | number | boolean;
type BicepDefault = BicepLiteral | BicepDefaultExpression;

interface BicepConfig {
  enabled?: boolean;
  paramName?: string;
  secure?: boolean;
  computeParam?: boolean;
  default?: BicepDefault;
  allowed?: BicepLiteral[];
  moduleValueExpression?: string;
}

interface BicepEnabledConfig extends BicepConfig {
  enabled: true;
  paramName: string;
}

interface ComputeBicepConfig extends BicepEnabledConfig {
  computeParam: true;
}

interface DeploymentSetting {
  id: string;
  githubName: string;
  description: string;
  classification: Classification;
  valueType: ValueType;
  requiredWhen: RequiredWhen;
  emitWhen?: EmitWhen;
  githubDefault?: string;
  appServiceName?: string;
  appServiceConditionParam?: string;
  bicep?: BicepConfig;
}

interface BicepEnabledDeploymentSetting extends DeploymentSetting {
  bicep: BicepEnabledConfig;
}

interface ComputeDeploymentSetting extends DeploymentSetting {
  bicep: ComputeBicepConfig;
}

interface RuntimeDeploymentSetting extends DeploymentSetting {
  appServiceName: string;
}

interface BicepAppServiceDeploymentSetting extends BicepEnabledDeploymentSetting {
  appServiceName: string;
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
  'infrastructure/azure/main.bicep',
  'infrastructure/azure/modules/compute.bicep',
  'infrastructure/azure/deploy.sh',
];

const allowedClassifications = new Set(['variable', 'secret']);
const allowedValueTypes = new Set(['string', 'int', 'bool']);
const allowedRequiredWhen = new Set(['always', 'deploy_infra', 'existing_infra', 'never']);
const allowedEmitWhen = new Set(['always', 'nonEmpty']);
const allowedExpressions = new Set([
  'appName',
  "env == 'prod' ? 'B1' : 'B1'",
  "env == 'prod' ? 'Basic' : 'Basic'",
  "env == 'prod' ? 'S0' : 'Basic'",
  "env == 'prod' ? 'Standard' : 'Basic'",
  'environment().authentication.loginEndpoint',
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

function lowerFirst(value: string): string {
  return `${value.slice(0, 1).toLowerCase()}${value.slice(1)}`;
}

function upperFirst(value: string): string {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1).toLowerCase()}`;
}

function githubNameToId(githubName: string): string {
  return githubName.toLowerCase().replace(/_+/g, '-');
}

function githubNameToParamName(githubName: string): string {
  const parts = githubName.split(/_+/).filter(Boolean);
  return lowerFirst(parts.map(upperFirst).join(''));
}

function shellQuote(value: string): string {
  return String(value).replaceAll("'", "'\"'\"'");
}

function bicepString(value: string | number | boolean): string {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function bicepValueType(setting: DeploymentSetting): ValueType {
  if (setting.valueType === 'int') {
    return 'int';
  }

  if (setting.valueType === 'bool') {
    return 'bool';
  }

  return 'string';
}

function renderBicepDefault(setting: BicepEnabledDeploymentSetting): string {
  const defaultValue = setting.bicep?.default;
  if (defaultValue === undefined) {
    return '';
  }

  if (typeof defaultValue === 'object' && defaultValue !== null) {
    return ` = ${defaultValue.expression}`;
  }

  if (setting.valueType === 'string') {
    return ` = ${bicepString(defaultValue)}`;
  }

  return ` = ${String(defaultValue)}`;
}

function renderBicepAllowed(setting: BicepEnabledDeploymentSetting): string[] {
  const allowed = setting.bicep.allowed;
  if (!allowed) {
    return [];
  }

  return ['@allowed([', ...allowed.map((value) => `  ${bicepString(value)}`), '])'];
}

function renderAppServiceValue(setting: BicepEnabledDeploymentSetting): string {
  const paramName = setting.bicep.paramName;
  if (setting.valueType === 'int' || setting.valueType === 'bool') {
    return `string(${paramName})`;
  }

  return paramName;
}

function appServiceCondition(setting: BicepEnabledDeploymentSetting): string {
  if (setting.appServiceConditionParam) {
    return `!empty(${setting.appServiceConditionParam})`;
  }

  const emitWhen = setting.emitWhen ?? 'nonEmpty';
  if (emitWhen === 'always' || setting.valueType !== 'string') {
    return '';
  }

  return `!empty(${setting.bicep.paramName})`;
}

function replaceBlock(content: string, id: string, generatedLines: string[]): string {
  const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(^[ \\t]*)# <deployment-settings:${escapedId}>\\n[\\s\\S]*?^[ \\t]*# </deployment-settings:${escapedId}>`, 'm');
  const slashPattern = new RegExp(`(^[ \\t]*)// <deployment-settings:${escapedId}>\\n[\\s\\S]*?^[ \\t]*// </deployment-settings:${escapedId}>`, 'm');
  const hashMatch = content.match(pattern);
  const slashMatch = content.match(slashPattern);

  if (!hashMatch && !slashMatch) {
    fail(`Missing generated block marker for ${id}.`);
  }

  const match = (hashMatch ?? slashMatch)!;
  const markerPrefix = hashMatch ? '#' : '//';
  const indent = match[1] ?? '';
  const body = generatedLines.map((line) => (line.length === 0 ? '' : `${indent}${line}`)).join('\n');
  const replacement = [`${indent}${markerPrefix} <deployment-settings:${id}>`, body, `${indent}${markerPrefix} </deployment-settings:${id}>`]
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

function validateDefault(setting: DeploymentSetting): void {
  const defaultValue = setting.bicep?.default;
  if (defaultValue === undefined) {
    return;
  }

  if (typeof defaultValue === 'object' && defaultValue !== null) {
    assertString(defaultValue.expression, `${setting.githubName}.bicep.default.expression`);
    if (!allowedExpressions.has(defaultValue.expression)) {
      fail(`${setting.githubName} uses unsupported Bicep default expression '${defaultValue.expression}'.`);
    }
    return;
  }

  if (setting.valueType === 'string' && typeof defaultValue !== 'string') {
    fail(`${setting.githubName} has a non-string default for a string setting.`);
  }

  if (setting.valueType === 'int' && (typeof defaultValue !== 'number' || !Number.isInteger(defaultValue) || defaultValue < 0)) {
    fail(`${setting.githubName} has an invalid int default.`);
  }

  if (setting.valueType === 'bool' && typeof defaultValue !== 'boolean') {
    fail(`${setting.githubName} has an invalid bool default.`);
  }
}

function validateBicepAllowed(setting: DeploymentSetting): void {
  const allowed = setting.bicep?.allowed;
  if (allowed === undefined) {
    return;
  }

  if (!Array.isArray(allowed) || allowed.length === 0) {
    fail(`${setting.githubName}.bicep.allowed must be a non-empty array.`);
  }

  const seen = new Set<string>();
  for (const value of allowed) {
    if (setting.valueType === 'string' && typeof value !== 'string') {
      fail(`${setting.githubName}.bicep.allowed contains a non-string value for a string setting.`);
    }

    if (setting.valueType === 'int' && (typeof value !== 'number' || !Number.isInteger(value) || value < 0)) {
      fail(`${setting.githubName}.bicep.allowed contains an invalid int value.`);
    }

    if (setting.valueType === 'bool' && typeof value !== 'boolean') {
      fail(`${setting.githubName}.bicep.allowed contains a non-boolean value for a bool setting.`);
    }

    const key = JSON.stringify(value);
    if (seen.has(key)) {
      fail(`${setting.githubName}.bicep.allowed contains duplicate value ${String(value)}.`);
    }
    seen.add(key);
  }
}

function validateContract(contract: unknown): asserts contract is DeploymentSettingsContract {
  validateSettingsArrayContract(contract, 'Resolved deployment settings');

  const githubNames = new Map<string, string>();
  const appServiceNames = new Map<string, string>();
  const bicepParamNames = new Map<string, string>();

  for (const setting of contract.settings) {
    assertPlainObject(setting, 'setting');
    assertString(setting.id, 'setting.id');
    assertString(setting.githubName, `${setting.id}.githubName`);
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

    if (githubNames.has(setting.githubName)) {
      fail(`Duplicate GitHub setting name '${setting.githubName}' in ${githubNames.get(setting.githubName)} and ${setting.id}.`);
    }
    githubNames.set(setting.githubName, setting.id);

    if (setting.appServiceName) {
      assertString(setting.appServiceName, `${setting.githubName}.appServiceName`);
      if (appServiceNames.has(setting.appServiceName)) {
        fail(`Duplicate App Service setting name '${setting.appServiceName}' in ${appServiceNames.get(setting.appServiceName)} and ${setting.id}.`);
      }
      appServiceNames.set(setting.appServiceName, setting.id);
    }

    const emitWhen = setting.emitWhen ?? 'nonEmpty';
    if (typeof emitWhen !== 'string' || !allowedEmitWhen.has(emitWhen)) {
      fail(`${setting.githubName} has invalid emitWhen '${emitWhen}'.`);
    }

    if (setting.appServiceConditionParam) {
      assertString(setting.appServiceConditionParam, `${setting.githubName}.appServiceConditionParam`);
    }

    if (setting.bicep !== undefined) {
      assertPlainObject(setting.bicep, `${setting.githubName}.bicep`);
    }

    if (setting.bicep?.enabled) {
      const bicep = setting.bicep;
      assertString(bicep.paramName, `${setting.githubName}.bicep.paramName`);
      if (setting.classification === 'secret' && bicep.secure !== true) {
        fail(`${setting.githubName} is a secret and must be marked bicep.secure=true.`);
      }

      if (bicepParamNames.has(bicep.paramName)) {
        fail(`Duplicate Bicep parameter '${bicep.paramName}' in ${bicepParamNames.get(bicep.paramName)} and ${setting.id}.`);
      }
      bicepParamNames.set(bicep.paramName, setting.id);
      validateDefault(setting as unknown as DeploymentSetting);
      validateBicepAllowed(setting as unknown as DeploymentSetting);

      if (setting.appServiceName && !bicep.computeParam) {
        fail(`${setting.githubName} has an App Service name and Bicep enabled, so bicep.computeParam must be true.`);
      }
    } else if (setting.bicep?.paramName) {
      fail(`${setting.githubName} defines bicep.paramName but bicep.enabled is not true.`);
    }
  }
}

function contractSettings(contract: DeploymentSettingsContract): DeploymentSetting[] {
  return sortSettings(contract.settings);
}

function canDisableDefaultSetting(setting: DeploymentSetting): boolean {
  return Boolean(
    setting.appServiceName &&
      setting.bicep?.enabled === true &&
      setting.bicep.computeParam === true &&
      !setting.bicep.moduleValueExpression,
  );
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
    const defaultSetting = defaultSettings.get(githubName);
    if (!defaultSetting) {
      fail(`deployment-settings.json disables unknown default setting ${githubName}.`);
    }

    if (!canDisableDefaultSetting(defaultSetting)) {
      fail(`${githubName} cannot be disabled because it participates in core infrastructure wiring; override its values instead.`);
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
  }

  for (const [index, addition] of overlay.additions.entries()) {
    assertPlainObject(addition, `deployment-settings.json additions[${index}]`);
  }

  const disabledParamNames = new Map<string, string>();
  for (const githubName of seenDisabled) {
    const defaultSetting = defaultSettings.get(githubName);
    const paramName = defaultSetting?.bicep?.enabled === true ? defaultSetting.bicep.paramName : undefined;
    if (paramName) {
      disabledParamNames.set(paramName, githubName);
    }
  }

  for (const defaultSetting of defaults.settings) {
    if (seenDisabled.has(defaultSetting.githubName)) {
      continue;
    }

    const setting = deepMerge(defaultSetting, overlay.overrides[defaultSetting.githubName] ?? {}) as DeploymentSetting;
    const disabledDependency = setting.appServiceConditionParam ? disabledParamNames.get(setting.appServiceConditionParam) : undefined;
    if (disabledDependency) {
      fail(`${setting.githubName} depends on disabled setting ${disabledDependency}; disable both settings or keep ${disabledDependency} enabled.`);
    }
  }
}

function normalizeAddition(addition: JsonObject): DeploymentSetting {
  const normalized = clone(addition);
  assertString(normalized.githubName, 'addition.githubName');

  normalized.id ??= githubNameToId(normalized.githubName);
  normalized.requiredWhen ??= 'never';
  normalized.emitWhen ??= normalized.valueType === 'string' ? 'nonEmpty' : 'always';

  if (normalized.appServiceName) {
    const bicep = isPlainObject(normalized.bicep) ? clone(normalized.bicep) : {};
    bicep.enabled = true;
    bicep.computeParam = true;
    bicep.paramName ??= githubNameToParamName(normalized.githubName);
    if (normalized.classification === 'secret') {
      bicep.secure = true;
    }

    if (normalized.valueType === 'string') {
      bicep.default ??= '';
    } else if (bicep.default === undefined) {
      fail(`${normalized.githubName} is an int/bool addition and must provide bicep.default.`);
    }

    normalized.bicep = bicep;
  }

  return normalized as unknown as DeploymentSetting;
}

function validateAdditionCollisions(defaults: DeploymentSettingsContract, additions: DeploymentSetting[]): void {
  const defaultGithubNames = new Set(defaults.settings.map((setting) => setting.githubName));
  const defaultAppServiceNames = new Set(defaults.settings.map((setting) => setting.appServiceName).filter(Boolean));
  const defaultBicepParamNames = new Set(defaults.settings.map((setting) => setting.bicep?.paramName).filter(Boolean));

  const addedGithubNames = new Set<string>();
  const addedAppServiceNames = new Set<string>();
  const addedBicepParamNames = new Set<string>();

  for (const addition of additions) {
    if (defaultGithubNames.has(addition.githubName)) {
      fail(`${addition.githubName} is already defined by deployment-settings-defaults.json; use overrides or disabled instead.`);
    }

    if (addedGithubNames.has(addition.githubName)) {
      fail(`Duplicate added GitHub setting name '${addition.githubName}'.`);
    }
    addedGithubNames.add(addition.githubName);

    if (addition.appServiceName) {
      if (defaultAppServiceNames.has(addition.appServiceName)) {
        fail(`${addition.githubName} uses App Service setting '${addition.appServiceName}' already defined by deployment-settings-defaults.json.`);
      }

      if (addedAppServiceNames.has(addition.appServiceName)) {
        fail(`Duplicate added App Service setting name '${addition.appServiceName}'.`);
      }
      addedAppServiceNames.add(addition.appServiceName);
    }

    if (addition.bicep?.paramName) {
      if (defaultBicepParamNames.has(addition.bicep.paramName)) {
        fail(`${addition.githubName} uses Bicep parameter '${addition.bicep.paramName}' already defined by deployment-settings-defaults.json.`);
      }

      if (addedBicepParamNames.has(addition.bicep.paramName)) {
        fail(`Duplicate added Bicep parameter '${addition.bicep.paramName}'.`);
      }
      addedBicepParamNames.add(addition.bicep.paramName);
    }
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

function hasEnabledBicep(setting: DeploymentSetting): setting is BicepEnabledDeploymentSetting {
  return setting.bicep?.enabled === true && typeof setting.bicep.paramName === 'string';
}

function hasComputeBicep(setting: DeploymentSetting): setting is ComputeDeploymentSetting {
  return hasEnabledBicep(setting) && setting.bicep.computeParam === true;
}

function hasAppServiceName(setting: DeploymentSetting): setting is RuntimeDeploymentSetting {
  return typeof setting.appServiceName === 'string' && setting.appServiceName.length > 0;
}

function hasBicepAppService(setting: DeploymentSetting): setting is BicepAppServiceDeploymentSetting {
  return hasEnabledBicep(setting) && hasAppServiceName(setting);
}

function secretSettings(settings: DeploymentSetting[]): DeploymentSetting[] {
  return settings.filter((setting) => setting.classification === 'secret');
}

function bicepSettings(settings: DeploymentSetting[]): BicepEnabledDeploymentSetting[] {
  return settings.filter(hasEnabledBicep);
}

function computeSettings(settings: DeploymentSetting[]): ComputeDeploymentSetting[] {
  return settings.filter(hasComputeBicep);
}

function bicepAppServiceSettings(settings: DeploymentSetting[]): BicepAppServiceDeploymentSetting[] {
  return settings.filter(hasBicepAppService);
}

function runtimeSettings(settings: DeploymentSetting[]): RuntimeDeploymentSetting[] {
  return settings.filter(hasAppServiceName);
}

function requiredSettings(settings: DeploymentSetting[], requiredWhen: RequiredWhen): DeploymentSetting[] {
  return settings.filter((setting) => setting.requiredWhen === requiredWhen);
}

function renderWorkflowSecrets(settings: DeploymentSetting[]): string[] {
  return secretSettings(settings).flatMap((setting) => [
    `${setting.githubName}:`,
    `  description: ${setting.description}`,
    '  required: false',
  ]);
}

function renderWorkflowEnv(settings: DeploymentSetting[]): string[] {
  return settings.map((setting) => {
    const source = setting.classification === 'secret' ? `secrets.${setting.githubName}` : `vars.${setting.githubName}`;
    const fallback = setting.githubDefault ? ` || '${setting.githubDefault}'` : '';
    return `${setting.githubName}: \${{ ${source}${fallback} }}`;
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

function renderWorkflowBicepParams(settings: DeploymentSetting[]): string[] {
  return bicepSettings(settings).map((setting) => `add_param "${setting.bicep.paramName}" "$${setting.githubName}"`);
}

function renderWorkflowRuntimeSettings(settings: DeploymentSetting[]): string[] {
  return runtimeSettings(settings).map((setting) => `add_setting "${setting.appServiceName}" "$${setting.githubName}"`);
}

function renderCiCdSecrets(settings: DeploymentSetting[]): string[] {
  return secretSettings(settings).map((setting) => `${setting.githubName}: \${{ secrets.${setting.githubName} }}`);
}

function renderMainBicepParams(settings: DeploymentSetting[]): string[] {
  const lines: string[] = [];
  for (const setting of bicepSettings(settings)) {
    if (setting.bicep.secure) {
      lines.push('@secure()');
    }
    lines.push(...renderBicepAllowed(setting));
    lines.push(`@description(${bicepString(setting.description)})`);
    lines.push(`param ${setting.bicep.paramName} ${bicepValueType(setting)}${renderBicepDefault(setting)}`);
    lines.push('');
  }

  return lines.slice(0, -1);
}

function renderMainComputeParams(settings: DeploymentSetting[]): string[] {
  return computeSettings(settings).map((setting) => {
    const value = setting.bicep.moduleValueExpression ?? setting.bicep.paramName;
    return `${setting.bicep.paramName}: ${value}`;
  });
}

function renderComputeBicepParams(settings: DeploymentSetting[]): string[] {
  return computeSettings(settings).flatMap((setting) => {
    const lines: string[] = [];
    if (setting.bicep.secure) {
      lines.push('@secure()');
    }
    lines.push(...renderBicepAllowed(setting));
    lines.push(`@description(${bicepString(setting.description.replace(' Defaults to the App Service hostname.', ''))})`);
    lines.push(`param ${setting.bicep.paramName} ${bicepValueType(setting)}`);
    lines.push('');
    return lines;
  }).slice(0, -1);
}

function renderComputeAppSettings(settings: DeploymentSetting[]): string[] {
  const appSettings = bicepAppServiceSettings(settings);
  const lines = ['var deploymentSettingsAppSettings = concat('];

  appSettings.forEach((setting, index) => {
    const condition = appServiceCondition(setting);
    const suffix = index === appSettings.length - 1 ? '' : ',';

    if (condition) {
      lines.push(`  ${condition} ? [`);
      lines.push('    {');
      lines.push(`      name: ${bicepString(setting.appServiceName)}`);
      lines.push(`      value: ${renderAppServiceValue(setting)}`);
      lines.push('    }');
      lines.push(`  ] : []${suffix}`);
    } else {
      lines.push('  [');
      lines.push('    {');
      lines.push(`      name: ${bicepString(setting.appServiceName)}`);
      lines.push(`      value: ${renderAppServiceValue(setting)}`);
      lines.push('    }');
      lines.push(`  ]${suffix}`);
    }
  });

  if (appSettings.length === 0) {
    lines.push('  []');
  }

  lines.push(')');
  return lines;
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

function renderDeployShBicepParams(settings: DeploymentSetting[]): string[] {
  return bicepSettings(settings).map((setting) => `add_param "${setting.bicep.paramName}" "\${${setting.githubName}:-}"`);
}

function renderDeployShRuntimeSettings(settings: DeploymentSetting[]): string[] {
  return runtimeSettings(settings).map((setting) => `add_setting "${setting.appServiceName}" "\${${setting.githubName}:-}"`);
}

function renderFile(relativePath: string, originalContent: string, settings: DeploymentSetting[]): string {
  let content = originalContent;

  switch (relativePath) {
    case '.github/workflows/deploy-azure-appservice.yml':
      content = replaceBlock(content, 'workflow-secrets', renderWorkflowSecrets(settings));
      content = replaceBlock(content, 'workflow-env', renderWorkflowEnv(settings));
      content = replaceBlock(content, 'workflow-required-checks', renderWorkflowRequiredChecks(settings));
      content = replaceBlock(content, 'workflow-bicep-params', renderWorkflowBicepParams(settings));
      content = replaceBlock(content, 'workflow-runtime-settings', renderWorkflowRuntimeSettings(settings));
      return content;
    case '.github/workflows/ci-cd.yml':
      content = replaceBlock(content, 'ci-cd-deploy-test-secrets', renderCiCdSecrets(settings));
      content = replaceBlock(content, 'ci-cd-deploy-manual-secrets', renderCiCdSecrets(settings));
      return content;
    case 'infrastructure/azure/main.bicep':
      content = replaceBlock(content, 'main-params', renderMainBicepParams(settings));
      content = replaceBlock(content, 'main-compute-params', renderMainComputeParams(settings));
      return content;
    case 'infrastructure/azure/modules/compute.bicep':
      content = replaceBlock(content, 'compute-params', renderComputeBicepParams(settings));
      content = replaceBlock(content, 'compute-app-settings', renderComputeAppSettings(settings));
      return content;
    case 'infrastructure/azure/deploy.sh':
      content = replaceBlock(content, 'deploy-sh-help', renderDeployShHelp(settings));
      content = replaceBlock(content, 'deploy-sh-required-checks', renderDeployShRequiredChecks(settings));
      content = replaceBlock(content, 'deploy-sh-bicep-params', renderDeployShBicepParams(settings));
      content = replaceBlock(content, 'deploy-sh-runtime-settings', renderDeployShRuntimeSettings(settings));
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
  const staleFiles: string[] = [];

  for (const relativePath of generatedTargets) {
    const fullPath = path.join(repoRoot, relativePath);
    const originalContent = await readFile(fullPath, 'utf8');
    const renderedContent = renderFile(relativePath, originalContent, settings);

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
