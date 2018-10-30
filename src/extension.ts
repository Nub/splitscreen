'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { commands, TextEditor, TextEditorEdit, Uri, ViewColumn } from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "splitscreen" is now active!');

    let relatedFile=new RelatedFiles();
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerTextEditorCommand('extension.sayHello', (editor, edit) => {
        // The code you place here will be executed every time your command is executed

        // Display a message box to the user
        vscode.window.showInformationMessage('Hello World!');
        relatedFile.onOpenRelated(editor,edit);
    });

    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
}


class RelatedFiles  {
  
    // constructor() {
    //   this.disposable = commands.registerTextEditorCommand('extension.auOpenRelated', this.onOpenRelated, this);
    // }
  
    // public dispose() {
    //   if (this.disposable) {
    //     this.disposable.dispose();
    //   }
    // }
  
    async onOpenRelated(editor: TextEditor, edit: TextEditorEdit) {
      if (!editor || !editor.document || editor.document.isUntitled) {
        return;
      }
  
      let relatedFile: any;
      const fileName = editor.document.fileName;
      const extension = path.extname(fileName).toLowerCase();
      if (extension === '.html') {
        const [tsFile, jsFile] = await Promise.all([
          this.relatedFileExists(fileName, '.ts'),
          this.relatedFileExists(fileName, '.js'),
        ]);
        if (tsFile) {
          relatedFile = tsFile;
        } else if (jsFile) {
          relatedFile = jsFile;
        }
      } else if (extension === '.js' || extension === '.ts') {
        relatedFile = await this.relatedFileExists(fileName, '.html');
      }
  
      if (relatedFile) {
        commands.executeCommand('vscode.open', Uri.file(relatedFile), ViewColumn.Two);
      }
    }
  
    private async relatedFileExists(fullPath: string, relatedExt: string): Promise<string | undefined> {
      const fileName = `${path.basename(fullPath, path.extname(fullPath))}${relatedExt}`;
      fullPath = path.join(path.dirname(fullPath), fileName);
  
      return new Promise<string | undefined>((resolve, reject) =>
          fs.access(fullPath, fs.constants.R_OK, err => resolve(err ? undefined : fullPath)));
    }
  }