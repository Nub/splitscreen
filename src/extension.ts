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

  let relatedFile = new RelatedFiles();
  // The command has been defined in the package.json file
  // Now provide the implementation of the command with  registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerTextEditorCommand('extension.sayHello', (editor, edit) => {
    // The code you place here will be executed every time your command is executed

    // Display a message box to the user
    vscode.window.showInformationMessage('Hello World!');
    relatedFile.onOpenRelated(editor, edit);
  });

  context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
}


class RelatedFiles {

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

    if (editor.viewColumn !== ViewColumn.One) {
      vscode.window.showInformationMessage('SplitScreen only works if you are in the first group of tabs');
      return;
    }


    let relatedFile: any;
    let relatedCssFile: any;
    const fileName = editor.document.fileName;
    const extension = path.extname(fileName).toLowerCase();
    if (extension === '.html') {
      const [tsFile, jsFile, scssFile] = await Promise.all([
        this.relatedFileExists(fileName, '.ts'),
        this.relatedFileExists(fileName, '.js'),
        this.relatedFileExists(fileName, '.scss'),
      ]);
      if (tsFile) {
        relatedFile = tsFile;
      } else if (jsFile) {
        relatedFile = jsFile;
      }

      if (scssFile) {
        relatedCssFile = scssFile;
      }

    } else if (extension === '.js' || extension === '.ts') {
      relatedFile = await this.relatedFileExists(fileName, '.html');
      relatedCssFile = await this.relatedFileExists(fileName, '.scss');
    } else if (extension === '.vue') {

      // Unfold all
      await commands.executeCommand('editor.unfoldAll');

      // <template>
      let currentEditor = this.getEditorByFileAndView(fileName, ViewColumn.One);
      if (currentEditor) {
        let [lineTemplate, lineScript, lineStyle] = this.getVueLineNumbers(currentEditor);
        await this.foldLine(currentEditor, lineTemplate);
        await this.foldLine(currentEditor, lineStyle);
        await this.gotoLine(currentEditor, lineScript);



        // <script>
        await commands.executeCommand('vscode.open', Uri.file(fileName), ViewColumn.Two);
        currentEditor = this.getEditorByFileAndView(fileName, ViewColumn.Two);
        if (currentEditor) {
          let [lineTemplate, lineScript, lineStyle] = this.getVueLineNumbers(currentEditor);
          await this.foldLine(currentEditor, lineScript);
          await this.foldLine(currentEditor, lineStyle);
          await this.gotoLine(currentEditor, lineTemplate);
        }

        // <style>
        await commands.executeCommand('vscode.open', Uri.file(fileName), ViewColumn.Three);
        currentEditor = this.getEditorByFileAndView(fileName, ViewColumn.Three);
        if (currentEditor) {
          let [lineTemplate, lineScript, lineStyle] = this.getVueLineNumbers(currentEditor);
          await this.foldLine(currentEditor, lineScript);
          await this.foldLine(currentEditor, lineTemplate);
          await this.gotoLine(currentEditor, lineStyle);
        }
      }
    }

    if (relatedFile) {
      commands.executeCommand('vscode.open', Uri.file(relatedFile), ViewColumn.Two);
    }
    if (relatedCssFile) {
      commands.executeCommand('vscode.open', Uri.file(relatedCssFile), ViewColumn.Three);
    }
  }

  private async relatedFileExists(fullPath: string, relatedExt: string): Promise<string | undefined> {
    const fileName = `${path.basename(fullPath, path.extname(fullPath))}${relatedExt}`;
    fullPath = path.join(path.dirname(fullPath), fileName);

    return new Promise<string | undefined>((resolve, reject) =>
      fs.access(fullPath, fs.constants.R_OK, err => resolve(err ? undefined : fullPath)));
  }

  private async gotoLine(editor: TextEditor, lineNumber: number | null) {

    if (!editor) {
      return;
    }

    if (lineNumber === null) {
      return;
    }
    let range = editor.document.lineAt(lineNumber).range;
    editor.selection = new vscode.Selection(range.start, range.end);
    editor.revealRange(range);
    await commands.executeCommand('editor.unfold');
    return;
  }


  private async foldLine(editor: TextEditor, lineNumber: number | null) {

    if (!editor) {
      return;
    }

    if (lineNumber === null) {
      return;
    }
    let range = editor.document.lineAt(lineNumber).range;
    editor.selection = new vscode.Selection(range.start, range.end);
    editor.revealRange(range);
    await commands.executeCommand('editor.fold');
    return;
  }

  private getVueLineNumbers(editor: TextEditor) {
    var content = editor.document.getText();
    if (content.length) {
      let lineTemplate: number | null = null;
      let lineScript: number | null = null;
      let lineStyle: number | null = null;
      let arr = content.split('\n');
      arr.forEach((l, i) => {
        if (l.indexOf('<template>') !== -1) {
          lineTemplate = i;
        } else if (l.indexOf('<script>') !== -1) {
          lineScript = i;
        } else if (l.indexOf('<style>') !== -1) {
          lineStyle = i;
        }
      });

      return [lineTemplate, lineScript, lineStyle];
    }
    return [null, null, null];
  }

  private getEditorByFileAndView(fileName: string, viewColumn: vscode.ViewColumn): TextEditor | undefined {


    return vscode.window.visibleTextEditors.find(x => x.viewColumn === viewColumn && x.document.fileName === fileName);

  }
}