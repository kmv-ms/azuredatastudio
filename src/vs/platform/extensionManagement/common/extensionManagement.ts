/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from 'vs/base/common/cancellation';
import { Event } from 'vs/base/common/event';
import { FileAccess } from 'vs/base/common/network';
import { IPager } from 'vs/base/common/paging';
import { isWeb, OperatingSystem, Platform, platform } from 'vs/base/common/platform';
import { arch } from 'vs/base/common/process';
import { URI } from 'vs/base/common/uri';
import { localize } from 'vs/nls';
import { ExtensionType, IExtension, IExtensionManifest } from 'vs/platform/extensions/common/extensions';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';

export const EXTENSION_IDENTIFIER_PATTERN = '^([a-z0-9A-Z][a-z0-9-A-Z]*)\\.([a-z0-9A-Z][a-z0-9-A-Z]*)$';
export const EXTENSION_IDENTIFIER_REGEX = new RegExp(EXTENSION_IDENTIFIER_PATTERN);
export const WEB_EXTENSION_TAG = '__web_extension';

export const enum TargetPlatform {
	WIN32_X64 = 'win32-x64',
	WIN32_IA32 = 'win32-ia32',
	WIN32_ARM64 = 'win32-arm64',

	LINUX_X64 = 'linux-x64',
	LINUX_ARM64 = 'linux-arm64',
	LINUX_ARMHF = 'linux-armhf',

	DARWIN_X64 = 'darwin-x64',
	DARWIN_ARM64 = 'darwin-arm64',

	WEB = 'web',

	UNIVERSAL = 'universal',
	UNKNOWN = 'unknown',
	UNDEFINED = 'undefined',
}

export function toTargetPlatform(targetPlatform: string): TargetPlatform {
	switch (targetPlatform) {
		case TargetPlatform.WIN32_X64: return TargetPlatform.WIN32_X64;
		case TargetPlatform.WIN32_IA32: return TargetPlatform.WIN32_IA32;
		case TargetPlatform.WIN32_ARM64: return TargetPlatform.WIN32_ARM64;

		case TargetPlatform.LINUX_X64: return TargetPlatform.LINUX_X64;
		case TargetPlatform.LINUX_ARM64: return TargetPlatform.LINUX_ARM64;
		case TargetPlatform.LINUX_ARMHF: return TargetPlatform.LINUX_ARMHF;

		case TargetPlatform.DARWIN_X64: return TargetPlatform.DARWIN_X64;
		case TargetPlatform.DARWIN_ARM64: return TargetPlatform.DARWIN_ARM64;

		case TargetPlatform.WEB: return TargetPlatform.WEB;

		case TargetPlatform.UNIVERSAL: return TargetPlatform.UNIVERSAL;
		default: return TargetPlatform.UNKNOWN;
	}
}

export function getTargetPlatformFromOS(os: OperatingSystem, arch: string): TargetPlatform {
	let platform: Platform;
	switch (os) {
		case OperatingSystem.Windows: platform = Platform.Windows; break;
		case OperatingSystem.Linux: platform = Platform.Linux; break;
		case OperatingSystem.Macintosh: platform = Platform.Mac; break;
	}
	return getTargetPlatform(platform, arch);
}

export function getTargetPlatform(platform: Platform, arch: string | undefined): TargetPlatform {
	switch (platform) {
		case Platform.Windows:
			if (arch === 'x64') {
				return TargetPlatform.WIN32_X64;
			}
			if (arch === 'ia32') {
				return TargetPlatform.WIN32_IA32;
			}
			if (arch === 'arm64') {
				return TargetPlatform.WIN32_ARM64;
			}
			return TargetPlatform.UNKNOWN;

		case Platform.Linux:
			if (arch === 'x64') {
				return TargetPlatform.LINUX_X64;
			}
			if (arch === 'arm64') {
				return TargetPlatform.LINUX_ARM64;
			}
			if (arch === 'arm') {
				return TargetPlatform.LINUX_ARMHF;
			}
			return TargetPlatform.UNKNOWN;

		case Platform.Mac:
			if (arch === 'x64') {
				return TargetPlatform.DARWIN_X64;
			}
			if (arch === 'arm64') {
				return TargetPlatform.DARWIN_ARM64;
			}
			return TargetPlatform.UNKNOWN;

		case Platform.Web: return TargetPlatform.WEB;
	}
}

export const CURRENT_TARGET_PLATFORM = isWeb ? TargetPlatform.WEB : getTargetPlatform(platform, arch);

export interface IGalleryExtensionProperties {
	dependencies?: string[];
	extensionPack?: string[];
	engine?: string;
	// {{SQL CARBON EDIT}}
	azDataEngine?: string;
	localizedLanguages?: string[];
	targetPlatform: TargetPlatform;
}

export interface IGalleryExtensionAsset {
	uri: string;
	fallbackUri: string;
}

export interface IGalleryExtensionAssets {
	manifest: IGalleryExtensionAsset | null;
	readme: IGalleryExtensionAsset | null;
	changelog: IGalleryExtensionAsset | null;
	license: IGalleryExtensionAsset | null;
	repository: IGalleryExtensionAsset | null;
	download: IGalleryExtensionAsset;
	// {{SQL CARBON EDIT}}
	downloadPage?: IGalleryExtensionAsset;
	icon: IGalleryExtensionAsset;
	coreTranslations: [string, IGalleryExtensionAsset][];
}

export function isIExtensionIdentifier(thing: any): thing is IExtensionIdentifier {
	return thing
		&& typeof thing === 'object'
		&& typeof thing.id === 'string'
		&& (!thing.uuid || typeof thing.uuid === 'string');
}

/* __GDPR__FRAGMENT__
	"ExtensionIdentifier" : {
		"id" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
		"uuid": { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
	}
 */
export interface IExtensionIdentifier {
	id: string;
	uuid?: string;
}

export interface IExtensionIdentifierWithVersion extends IExtensionIdentifier {
	id: string;
	uuid?: string;
	version: string;
}

export interface IGalleryExtensionIdentifier extends IExtensionIdentifier {
	uuid: string;
}

export interface IGalleryExtensionVersion {
	version: string;
	date: string;
}

export interface IGalleryExtension {
	name: string;
	identifier: IGalleryExtensionIdentifier;
	version: string;
	displayName: string;
	publisherId: string;
	publisher: string;
	publisherDisplayName: string;
	description: string;
	installCount: number;
	rating: number;
	ratingCount: number;
	categories: readonly string[];
	tags: readonly string[];
	releaseDate: number;
	lastUpdated: number;
	preview: boolean;
	allTargetPlatforms: TargetPlatform[];
	assets: IGalleryExtensionAssets;
	properties: IGalleryExtensionProperties;
	telemetryData: any;
}

export interface IGalleryMetadata {
	id: string;
	publisherId: string;
	publisherDisplayName: string;
}

export interface ILocalExtension extends IExtension {
	isMachineScoped: boolean;
	publisherId: string | null;
	publisherDisplayName: string | null;
	installedTimestamp?: number;
}

export const enum SortBy {
	NoneOrRelevance = 0,
	LastUpdatedDate = 1,
	Title = 2,
	PublisherName = 3,
	InstallCount = 4,
	PublishedDate = 5,
	AverageRating = 6,
	WeightedRating = 12
}

export const enum SortOrder {
	Default = 0,
	Ascending = 1,
	Descending = 2
}

export interface IQueryOptions {
	text?: string;
	ids?: string[];
	names?: string[];
	pageSize?: number;
	sortBy?: SortBy;
	sortOrder?: SortOrder;
	source?: string;
	// {{SQL CARBON EDIT}} do not show extensions matching excludeFlags in the marketplace
	// This field only supports an exact match of a single flag.  It doesn't currently
	// support setting multiple flags such as "hidden,preview" since this functionality isn't
	// required by current usage scenarios.
	excludeFlags?: string;
}

export const enum StatisticType {
	Install = 'install',
	Uninstall = 'uninstall'
}

export interface IReportedExtension {
	id: IExtensionIdentifier;
	malicious: boolean;
}

export const enum InstallOperation {
	None = 0,
	Install,
	Update
}

export interface ITranslation {
	contents: { [key: string]: {} };
}

export const IExtensionGalleryService = createDecorator<IExtensionGalleryService>('extensionGalleryService');
export interface IExtensionGalleryService {
	readonly _serviceBrand: undefined;
	isEnabled(): boolean;
	query(token: CancellationToken): Promise<IPager<IGalleryExtension>>;
	query(options: IQueryOptions, token: CancellationToken): Promise<IPager<IGalleryExtension>>;
	getExtensions(identifiers: ReadonlyArray<IExtensionIdentifier | IExtensionIdentifierWithVersion>, token: CancellationToken): Promise<IGalleryExtension[]>;
	download(extension: IGalleryExtension, location: URI, operation: InstallOperation): Promise<void>;
	reportStatistic(publisher: string, name: string, version: string, type: StatisticType): Promise<void>;
	getReadme(extension: IGalleryExtension, token: CancellationToken): Promise<string>;
	getManifest(extension: IGalleryExtension, token: CancellationToken): Promise<IExtensionManifest | null>;
	getChangelog(extension: IGalleryExtension, token: CancellationToken): Promise<string>;
	getCoreTranslation(extension: IGalleryExtension, languageId: string): Promise<ITranslation | null>;
	getExtensionsReport(): Promise<IReportedExtension[]>;
	isExtensionCompatible(extension: IGalleryExtension, targetPlatform: TargetPlatform): Promise<boolean>;
	getCompatibleExtension(extension: IGalleryExtension, targetPlatform: TargetPlatform): Promise<IGalleryExtension | null>;
	getCompatibleExtension(id: IExtensionIdentifier, targetPlatform: TargetPlatform): Promise<IGalleryExtension | null>;
	getAllCompatibleVersions(extension: IGalleryExtension, targetPlatform: TargetPlatform): Promise<IGalleryExtensionVersion[]>;
}

export interface InstallExtensionEvent {
	identifier: IExtensionIdentifier;
	source: URI | IGalleryExtension;
}

export interface InstallExtensionResult {
	readonly identifier: IExtensionIdentifier;
	readonly operation: InstallOperation;
	readonly source?: URI | IGalleryExtension;
	readonly local?: ILocalExtension;
}

export interface DidUninstallExtensionEvent {
	identifier: IExtensionIdentifier;
	error?: string;
}

export const INSTALL_ERROR_NOT_SUPPORTED = 'notsupported';
export const INSTALL_ERROR_MALICIOUS = 'malicious';
export const INSTALL_ERROR_INCOMPATIBLE = 'incompatible';

export class ExtensionManagementError extends Error {
	constructor(message: string, readonly code: string) {
		super(message);
		this.name = code;
	}
}

export type InstallOptions = { isBuiltin?: boolean, isMachineScoped?: boolean, donotIncludePackAndDependencies?: boolean, installGivenVersion?: boolean };
export type InstallVSIXOptions = Omit<InstallOptions, 'installGivenVersion'> & { installOnlyNewlyAddedFromExtensionPack?: boolean };
export type UninstallOptions = { donotIncludePack?: boolean, donotCheckDependents?: boolean };

export interface IExtensionManagementParticipant {
	postInstall(local: ILocalExtension, source: URI | IGalleryExtension, options: InstallOptions | InstallVSIXOptions, token: CancellationToken): Promise<void>;
	postUninstall(local: ILocalExtension, options: UninstallOptions, token: CancellationToken): Promise<void>;
}

export const IExtensionManagementService = createDecorator<IExtensionManagementService>('extensionManagementService');
export interface IExtensionManagementService {
	readonly _serviceBrand: undefined;

	onInstallExtension: Event<InstallExtensionEvent>;
	onDidInstallExtensions: Event<readonly InstallExtensionResult[]>;
	onUninstallExtension: Event<IExtensionIdentifier>;
	onDidUninstallExtension: Event<DidUninstallExtensionEvent>;

	zip(extension: ILocalExtension): Promise<URI>;
	unzip(zipLocation: URI): Promise<IExtensionIdentifier>;
	getManifest(vsix: URI): Promise<IExtensionManifest>;
	install(vsix: URI, options?: InstallVSIXOptions): Promise<ILocalExtension>;
	canInstall(extension: IGalleryExtension): Promise<boolean>;
	installFromGallery(extension: IGalleryExtension, options?: InstallOptions): Promise<ILocalExtension>;
	uninstall(extension: ILocalExtension, options?: UninstallOptions): Promise<void>;
	reinstallFromGallery(extension: ILocalExtension): Promise<void>;
	getInstalled(type?: ExtensionType): Promise<ILocalExtension[]>;
	getExtensionsReport(): Promise<IReportedExtension[]>;

	updateMetadata(local: ILocalExtension, metadata: IGalleryMetadata): Promise<ILocalExtension>;
	updateExtensionScope(local: ILocalExtension, isMachineScoped: boolean): Promise<ILocalExtension>;

	registerParticipant(pariticipant: IExtensionManagementParticipant): void;
}

export const DISABLED_EXTENSIONS_STORAGE_PATH = 'extensionsIdentifiers/disabled';
export const ENABLED_EXTENSIONS_STORAGE_PATH = 'extensionsIdentifiers/enabled';
export const IGlobalExtensionEnablementService = createDecorator<IGlobalExtensionEnablementService>('IGlobalExtensionEnablementService');

export interface IGlobalExtensionEnablementService {
	readonly _serviceBrand: undefined;
	readonly onDidChangeEnablement: Event<{ readonly extensions: IExtensionIdentifier[], readonly source?: string }>;

	getDisabledExtensions(): IExtensionIdentifier[];
	enableExtension(extension: IExtensionIdentifier, source?: string): Promise<boolean>;
	disableExtension(extension: IExtensionIdentifier, source?: string): Promise<boolean>;

}

export type IConfigBasedExtensionTip = {
	readonly extensionId: string,
	readonly extensionName: string,
	readonly isExtensionPack: boolean,
	readonly configName: string,
	readonly important: boolean,
};

export type IExecutableBasedExtensionTip = {
	readonly extensionId: string,
	readonly extensionName: string,
	readonly isExtensionPack: boolean,
	readonly exeName: string,
	readonly exeFriendlyName: string,
	readonly windowsPath?: string,
};

export type IWorkspaceTips = { readonly remoteSet: string[]; readonly recommendations: string[]; };

export const IExtensionTipsService = createDecorator<IExtensionTipsService>('IExtensionTipsService');
export interface IExtensionTipsService {
	readonly _serviceBrand: undefined;

	getConfigBasedTips(folder: URI): Promise<IConfigBasedExtensionTip[]>;
	getImportantExecutableBasedTips(): Promise<IExecutableBasedExtensionTip[]>;
	getOtherExecutableBasedTips(): Promise<IExecutableBasedExtensionTip[]>;
	getAllWorkspacesTips(): Promise<IWorkspaceTips[]>;
}


export const DefaultIconPath = FileAccess.asBrowserUri('./media/defaultIcon.png', require).toString(true);
export const ExtensionsLabel = localize('extensions', "Extensions");
export const ExtensionsLocalizedLabel = { value: ExtensionsLabel, original: 'Extensions' };
export const ExtensionsChannelId = 'extensions';
export const PreferencesLabel = localize('preferences', "Preferences");
export const PreferencesLocalizedLabel = { value: PreferencesLabel, original: 'Preferences' };


export interface CLIOutput {
	log(s: string): void;
	error(s: string): void;
}

export const IExtensionManagementCLIService = createDecorator<IExtensionManagementCLIService>('IExtensionManagementCLIService');
export interface IExtensionManagementCLIService {
	readonly _serviceBrand: undefined;

	listExtensions(showVersions: boolean, category?: string, output?: CLIOutput): Promise<void>;
	installExtensions(extensions: (string | URI)[], builtinExtensionIds: string[], isMachineScoped: boolean, force: boolean, output?: CLIOutput): Promise<void>;
	uninstallExtensions(extensions: (string | URI)[], force: boolean, output?: CLIOutput): Promise<void>;
	locateExtension(extensions: string[], output?: CLIOutput): Promise<void>;
}