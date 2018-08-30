"use babel";

import { CompositeDisposable } from "atom";
import { execSync } from "child_process";
import { dirname } from "path";

export default {
  subscriptions: null,
  activate(state) {
    this.subscriptions = new CompositeDisposable();
    this.subscriptions.add(
      atom.config.observe("atom-black.blackCommand", value => {
        this.blackCommand = value;
      })
    );
    this.subscriptions.add(
      atom.config.observe("atom-black.blackenOnSave", value => {
        this.blackenOnSave = value;
      })
    );
    this.subscriptions.add(
      atom.commands.add("atom-workspace", {
        "atom-black:blacken": () => this.blacken()
      })
    );
    this.subscriptions.add(
      atom.commands.add("atom-workspace", {
        "atom-black:toggle-blacken-on-save": () =>
          (this.blackenOnSave = !this.blackenOnSave)
      })
    );
    this.subscriptions.add(
      atom.workspace.observeTextEditors(editor => {
        this.subscriptions.add(
          editor.onDidSave(() => this.blackenAfterSave(editor))
        );
      })
    );
  },

  deactivate() {
    this.subscriptions.dispose();
  },

  isPythonEditor(editor) {
    return editor.getGrammar().scopeName == "source.python";
  },

  notifyBlackError(err) {
    atom.notifications.addError("Black failed to reformat 💥 💔 💥", {
      detail: err.message
        .split(":")
        .slice(3)
        .join(":"),
      dismissable: true
    });
  },

  blacken() {
    const editor = atom.workspace.getActiveTextEditor();
    if (!editor || !this.isPythonEditor(editor)) {
      return;
    }
    const current_text = editor.getText();
    const path = editor.getPath();
    const cwd = path ? dirname(path) : null;
    try {
      const blackened_text = execSync(this.blackCommand + " --quiet -", {
        input: current_text,
        cwd: cwd
      }).toString("utf8");
      editor.setText(blackened_text);
    } catch (err) {
      this.notifyBlackError(err);
    }
  },

  blackenAfterSave(editor) {
    if (!this.blackenOnSave || !this.isPythonEditor(editor)) {
      return;
    }
    try {
      var path = editor.getPath();
      if (process.platform == "win32") {
        path = path.replace(/ /g, "^ ");
      } else {
        path = path.replace(/ /g, "\\ ");
      }
      execSync(this.blackCommand + " --quiet " + path);
    } catch (err) {
      this.notifyBlackError(err);
    }
  }
};
