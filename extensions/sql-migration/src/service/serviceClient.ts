/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { SqlOpsDataClient, ClientOptions } from 'dataprotocol-client';
import { ServerProvider, Events, LogLevel } from '@microsoft/ads-service-downloader';
import { ServerOptions, TransportKind } from 'vscode-languageclient';
import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
const localize = nls.loadMessageBundle();
import * as path from 'path';
import { EventAndListener } from 'eventemitter2';
import { SqlMigrationService } from './features';
import { promises as fs } from 'fs';
import * as constants from '../constants/strings';
import { IMessage } from './contracts';
import { ErrorAction, CloseAction } from 'vscode-languageclient';

export class ServiceClient {
	private statusView: vscode.StatusBarItem;

	constructor(
		private outputChannel: vscode.OutputChannel,
	) {
		this.statusView = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
	}

	public async startService(context: vscode.ExtensionContext): Promise<SqlOpsDataClient | undefined> {
		const rawConfig = await fs.readFile(path.join(context.extensionPath, 'config.json'));
		let clientOptions: ClientOptions = this.createClientOptions();
		try {
			let client: SqlOpsDataClient;
			let serviceBinaries = await this.downloadBinaries(context, rawConfig);
			//serviceBinaries = "C:\\Users\\aaskhan\\src\\sts3\\src\\Microsoft.SqlTools.Migration\\bin\\Debug\\net6.0\\win-x64\\publish\\MicrosoftSqlToolsMigration.exe";
			let serverOptions = this.generateServerOptions(serviceBinaries, context);
			client = new SqlOpsDataClient(constants.serviceName, serverOptions, clientOptions);
			client.onReady().then(() => {
				this.statusView.text = localize('serviceStarted', "{0} Started", constants.serviceName);
				setTimeout(() => {
					this.statusView.hide();
				}, 1500);
			}).catch(e => {
				console.error(e);
			});
			this.statusView.show();
			this.statusView.text = localize('serviceStarting', "Starting {0}", constants.serviceName);
			let disposable = client.start();
			context.subscriptions.push(disposable);
			return client;
		}
		catch (error) {
			await vscode.window.showErrorMessage(localize('flatFileImport.serviceStartFailed', "Failed to start {0}: {1}", constants.serviceName, error));
			return undefined;
		}
	}

	public async downloadBinaries(context: vscode.ExtensionContext, rawConfig: Buffer): Promise<string> {
		const config = JSON.parse(rawConfig.toString());
		config.installDirectory = path.join(context.extensionPath, config.installDirectory);
		config.proxy = vscode.workspace.getConfiguration('http').get('proxy');
		config.strictSSL = vscode.workspace.getConfiguration('http').get('proxyStrictSSL') || true;
		const serverdownloader = new ServerProvider(config);
		serverdownloader.eventEmitter.onAny(this.generateHandleServerProviderEvent());
		return serverdownloader.getOrDownloadServer();
	}

	private createClientOptions(): ClientOptions {
		return {
			providerId: constants.providerId,
			errorHandler: new LanguageClientErrorHandler(),
			synchronize: {
				configurationSection: [constants.extensionConfigSectionName, constants.sqlConfigSectionName]
			},
			features: [
				// we only want to add new features
				SqlMigrationService
			],
			outputChannel: new CustomOutputChannel()
		};
	}

	private generateServerOptions(executablePath: string, context: vscode.ExtensionContext): ServerOptions {
		let launchArgs = [];
		launchArgs.push(`--locale`, vscode.env.language);
		launchArgs.push('--log-file', path.join(context.logUri.fsPath, 'sqlmigration.log'));
		launchArgs.push('--log-dir', context.logUri.fsPath);
		launchArgs.push('--tracing-level', this.getConfigTracingLevel());
		return { command: executablePath, args: launchArgs, transport: TransportKind.stdio };
	}

	private getConfigTracingLevel(): TracingLevel {
		let config = vscode.workspace.getConfiguration('mssql');
		if (config) {
			return config['tracingLevel'];
		} else {
			return TracingLevel.Critical;
		}
	}

	private generateHandleServerProviderEvent(): EventAndListener {
		let dots = 0;
		return (e: string | string[], ...args: any[]) => {
			switch (e) {
				case Events.INSTALL_START:
					this.outputChannel.show(true);
					this.statusView.show();
					this.outputChannel.appendLine(localize('installingServiceDetailed', "Installing {0} to {1}", constants.serviceName, args[0]));
					this.statusView.text = localize('installingService', "Installing {0} Service", constants.serviceName);
					break;
				case Events.INSTALL_END:
					this.outputChannel.appendLine(localize('serviceInstalled', "Installed {0}", constants.serviceName));
					break;
				case Events.DOWNLOAD_START:
					this.outputChannel.appendLine(localize('downloadingService', "Downloading {0}", args[0]));
					this.outputChannel.append(localize('downloadingServiceSize', "({0} KB)", Math.ceil(args[1] / 1024).toLocaleString(vscode.env.language)));
					this.statusView.text = localize('downloadingServiceStatus', "Downloading {0}", constants.serviceName);
					break;
				case Events.DOWNLOAD_PROGRESS:
					let newDots = Math.ceil(args[0] / 5);
					if (newDots > dots) {
						this.outputChannel.append('.'.repeat(newDots - dots));
						dots = newDots;
					}
					break;
				case Events.DOWNLOAD_END:
					this.outputChannel.appendLine(localize('downloadingServiceComplete', "Done downloading {0}", constants.serviceName));
					break;
				case Events.ENTRY_EXTRACTED:
					this.outputChannel.appendLine(localize('entryExtractedChannelMsg', "Extracted {0} ({1}/{2})", args[0], args[1], args[2]));
					break;
				case Events.LOG_EMITTED:
					if (args[0] >= LogLevel.Warning) {
						this.outputChannel.appendLine(args[1]);
					}
					break;
				default:
					break;
			}
		};
	}
}

class CustomOutputChannel implements vscode.OutputChannel {
	name: string = '';
	append(value: string): void {
	}
	appendLine(value: string): void {
	}
	// tslint:disable-next-line:no-empty
	clear(): void {
	}
	show(preserveFocus?: boolean): void;
	show(column?: vscode.ViewColumn, preserveFocus?: boolean): void;
	// tslint:disable-next-line:no-empty
	show(column?: any, preserveFocus?: any): void {
	}
	// tslint:disable-next-line:no-empty
	hide(): void {
	}
	// tslint:disable-next-line:no-empty
	dispose(): void {
	}
	replace(_value: string): void {
	}
}

/**
 * Handle Language Service client errors
 */
class LanguageClientErrorHandler {

	/**
	 * Creates an instance of LanguageClientErrorHandler.
	 * @memberOf LanguageClientErrorHandler
	 */
	constructor() {

	}

	/**
	 * Show an error message prompt with a link to known issues wiki page
	 * @memberOf LanguageClientErrorHandler
	 */
	showOnErrorPrompt(error: Error): void {
		// TODO add telemetry
		// Telemetry.sendTelemetryEvent('SqlToolsServiceCrash');
		vscode.window.showErrorMessage(
			constants.serviceCrashMessage(error.message),
		).then(() => { }, () => { });
	}

	/**
	 * Callback for language service client error
	 *
	 * @memberOf LanguageClientErrorHandler
	 */
	error(error: Error, message: IMessage, count: number): ErrorAction {
		this.showOnErrorPrompt(error);

		// we don't retry running the service since crashes leave the extension
		// in a bad, unrecovered state
		return ErrorAction.Shutdown;
	}

	/**
	 * Callback for language service client closed
	 *
	 * @memberOf LanguageClientErrorHandler
	 */
	closed(): CloseAction {
		this.showOnErrorPrompt({ name: 'Service crashed', message: constants.serviceCrashed });

		// we don't retry running the service since crashes leave the extension
		// in a bad, unrecovered state
		return CloseAction.DoNotRestart;
	}
}

/**
 * The tracing level defined in the package.json
 */
enum TracingLevel {
	All = 'All',
	Off = 'Off',
	Critical = 'Critical',
	Error = 'Error',
	Warning = 'Warning',
	Information = 'Information',
	Verbose = 'Verbose'
}
