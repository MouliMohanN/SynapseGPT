import {
  EditorView,
  Decoration,
  DecorationSet,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
  keymap,
} from "@codemirror/view";
import {
  StateField,
  StateEffect,
  Extension,
} from "@codemirror/state";

// Effect to update the ghost text
export const setGhostText = StateEffect.define<string | null>();

// State field to hold the decoration
export const ghostTextField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    decorations = decorations.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(setGhostText)) {
        if (e.value) {
          const head = tr.state.selection.main.head;
          const widget = Decoration.widget({
            widget: new GhostTextWidget(e.value),
            side: 1,
          });
          decorations = Decoration.set([widget.range(head)]);
        } else {
          decorations = Decoration.none;
        }
      }
    }

    // Handle type-through: if user types characters that match the ghost text, shrink it.
    if (tr.docChanged && !tr.effects.some((e) => e.is(setGhostText))) {
      const changes = tr.changes;
      changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
        if (decorations.size === 0) return;
        
        const iter = decorations.iter();
        while (iter.value) {
          // Check if the change happened right before the widget
          if (iter.from === toB) { 
             // The widget is at `iter.from`. The insertion ended at `toB`.
             // If `toB` == `iter.from`, it means text was inserted right before the widget.
             // Wait, `map(tr.changes)` already moved the widget to `toB`.
             
             const widget = iter.value.spec.widget;
             if (widget instanceof GhostTextWidget) {
               const insertedText = inserted.toString();
               if (widget.text.startsWith(insertedText)) {
                 // User typed part of the suggestion. Shrink it.
                 const newText = widget.text.slice(insertedText.length);
                 if (newText) {
                   const newWidget = Decoration.widget({
                     widget: new GhostTextWidget(newText),
                     side: 1,
                   });
                   // We need to replace the decoration.
                   // Since we are iterating, we can't easily mutate.
                   // But we know there's only one decoration usually.
                   decorations = Decoration.set([newWidget.range(iter.from)]);
                 } else {
                   // Fully typed!
                   decorations = Decoration.none;
                 }
               }
             }
          }
          iter.next();
        }
      });
    }
    
    // REMOVED: Clear on selection change
    // if (tr.selection && !tr.effects.some((e) => e.is(setGhostText))) {
    //     decorations = Decoration.none;
    // }
    
    return decorations;
  },
  provide: (f) => EditorView.decorations.from(f),
});

class GhostTextWidget extends WidgetType {
  constructor(readonly text: string) {
    super();
  }

  toDOM() {
    const span = document.createElement("span");
    span.textContent = this.text;
    span.className = "cm-ghost-text";
    span.style.color = "rgba(148, 163, 184, 0.75)"; // neutral slate-like grey
    span.style.backgroundColor = "transparent";
    span.style.pointerEvents = "none";
    span.style.userSelect = "none";
    return span;
  }
  
  eq(other: GhostTextWidget) {
    return other.text === this.text;
  }
}

// Plugin to fetch suggestions
export class GhostTextFetcher {
  private timeout: NodeJS.Timeout | null = null;
  private abortController: AbortController | null = null;

  constructor(private view: EditorView, private options: {
    enabled: boolean;
    debounceDelay: number;
    model: string;
    temperature: number;
    topP: number;
    maxTokens: number;
    repeatPenalty: number;
  }) {}

  update(update: ViewUpdate) {
    if (update.docChanged || update.selectionSet) {
      this.scheduleFetch();
    }
  }

  scheduleFetch() {
    if (this.timeout) clearTimeout(this.timeout);
    if (this.abortController) this.abortController.abort();
    
    this.timeout = setTimeout(() => this.fetchSuggestion(), this.options.debounceDelay);
  }

  async fetchSuggestion() {
    const state = this.view.state;
    const head = state.selection.main.head;
    
    const text = state.doc.toString();
    
    this.abortController = new AbortController();
    
    try {
      const res = await fetch("/api/completion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          cursorOffset: head,
          modelConfig: {
            model: this.options.model,
            temperature: this.options.temperature,
            topP: this.options.topP,
            maxTokens: this.options.maxTokens,
            repeatPenalty: this.options.repeatPenalty,
          },
        }),
        signal: this.abortController.signal,
      });

      if (!res.ok || !res.body) return;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let suggestion = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        suggestion += chunk;
        
        this.view.dispatch({ effects: setGhostText.of(suggestion) });
      }
      
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error(err);
    }
  }
}

import { Prec } from "@codemirror/state";

// Keymap to accept or reject suggestion
const acceptGhostTextKeymap = Prec.highest(keymap.of([
  {
    key: "Tab",
    run: (view) => {
      console.log("Tab pressed in GhostTextExtension");
      const decorations = view.state.field(ghostTextField);
      if (decorations.size === 0) {
          console.log("No ghost text decorations found");
          return false;
      }

      let suggestion = "";
      const iter = decorations.iter();
      while (iter.value) {
        if (iter.value.spec.widget instanceof GhostTextWidget) {
          suggestion = iter.value.spec.widget.text;
          break;
        }
        iter.next();
      }

      if (!suggestion) {
          console.log("No suggestion text found in widget");
          return false;
      }

      console.log("Accepting suggestion:", suggestion);
      view.dispatch({
        changes: { from: view.state.selection.main.head, insert: suggestion },
        effects: setGhostText.of(null),
        selection: { anchor: view.state.selection.main.head + suggestion.length },
      });
      return true;
    },
  },
  {
    key: "Escape",
    run: (view) => {
      const decorations = view.state.field(ghostTextField);
      if (decorations.size === 0) return false;
      
      view.dispatch({ effects: setGhostText.of(null) });
      return true;
    },
  },
]));

export const ghostTextExtension = (options: {
  enabled: boolean;
  debounceDelay: number;
  model: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  repeatPenalty: number;
}): Extension => {
  if (!options.enabled) return [];

  const plugin = ViewPlugin.define((view) => new GhostTextFetcher(view, options));
  
  return [
    ghostTextField,
    plugin,
    acceptGhostTextKeymap,
  ];
};
