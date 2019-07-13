import SES from "ses";
import * as monaco from "monaco-editor";

AFRAME.registerComponent("script", {
  schema: {
    source: { type: "string", default: "" }
  },
  init() {
    this.rootRealm = SES.makeSESRootRealm({ errorStackMode: "allow" });

    const ownedEntities = [];

    this.ownedEntities = ownedEntities;

    const rootEl = this.el;

    const UNSAFE = {
      console,
      createEntity() {
        const el = document.createElement("a-entity");
        rootEl.appendChild(el);
        return ownedEntities.push(el) - 1;
      },
      destroyEntity(entityId) {
        const el = ownedEntities[entityId];

        if (el) {
          el.parentNode.removeChild(el);
          return true;
        }

        return false;
      },
      getComponent(entityId, componentName) {
        const el = ownedEntities[entityId];

        if (el) {
          return el.getAttribute(componentName);
        }

        return undefined;
      },
      setComponent(entityId, componentName, props) {
        const el = ownedEntities[entityId];

        if (el) {
          el.setAttribute(componentName, props);
        }
      },
      removeComponent(entityId, componentName) {
        const el = ownedEntities[entityId];

        if (el) {
          el.removeAttribute(componentName);
        }
      }
    };

    function makeApiEndowments() {
      return {
        console: {
          log(...args) {
            UNSAFE.console.log(...args);
          }
        },
        createEntity() {
          return UNSAFE.createEntity();
        },
        destroyEntity(entityId) {
          return UNSAFE.destroyEntity(entityId);
        },
        getComponent(entityId, componentName) {
          return UNSAFE.getComponent(entityId, componentName);
        },
        setComponent(entityId, componentName, props) {
          return UNSAFE.setComponent(entityId, componentName, props);
        },
        removeComponent(entityId, componentName) {
          return UNSAFE.removeComponent(entityId, componentName);
        }
      };
    }

    this.apiEndowments = this.rootRealm.evaluate(`(${makeApiEndowments})()`, { UNSAFE });
  },

  update(prevData) {
    if (this.data.source !== prevData.source) {
      for (const el of this.ownedEntities) {
        this.el.removeChild(el);
      }

      this.rootRealm.evaluate(this.data.source, this.apiEndowments);
    }
  }
});

AFRAME.registerComponent("script-editor", {
  init() {
    const editorContainer = document.createElement("div");
    editorContainer.style.position = "fixed";
    editorContainer.style.top = "20vh";
    editorContainer.style.bottom = "20vh";
    editorContainer.style.width = "30vw";
    this.el.appendChild(editorContainer);

    let scriptSource;

    const sceneEl = this.el.sceneEl;
    let scriptEl = document.querySelector("[script]");

    if (scriptEl) {
      scriptSource = scriptEl.getAttribute("script").source;
    } else {
      scriptSource = "";
      scriptEl = document.createElement("a-entity");
      sceneEl.appendChild(scriptEl);
    }

    const editor = monaco.editor.create(editorContainer, {
      value: scriptSource,
      language: "javascript",
      theme: "vs-dark"
    });

    editor.addAction({
      id: "save-script",
      label: "Save Script",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S],
      precondition: null,
      keybindingContext: null,
      contextMenuGroupId: "navigation",
      contextMenuOrder: 1.5,
      run(ed) {
        scriptEl.setAttribute("networked", { template: "#script" });
        scriptEl.setAttribute("script", { source: ed.getValue() });
        return null;
      }
    });

    this.editorContainer = editorContainer;
  },

  remove() {
    this.el.removeChild(this.editorContainer);
  }
});
