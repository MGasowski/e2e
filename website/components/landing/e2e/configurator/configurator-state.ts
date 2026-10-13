import {
  buildConfigLines,
  changedLineKeys,
  type ConfiguratorState,
  DEFAULT_STATE,
  type EditableField,
  withSupportedModel,
} from "./config-code";

export const MAX_INSTRUCTIONS_LENGTH = 220;
export const MAX_CUSTOM_MODEL_LENGTH = 80;
export const MAX_CUSTOM_ENGINE_LENGTH = 40;

export type ConfiguratorView = {
  config: ConfiguratorState;
  /** Lines changed by the last step control; they stay lit until the next change or step. */
  flashKeys: ReadonlySet<string>;
};

export type ConfiguratorAction =
  | { type: "set"; patch: Partial<ConfiguratorState> }
  | { type: "edit"; field: EditableField; value: string }
  | { type: "clear-flash" };

export const INITIAL_VIEW: ConfiguratorView = {
  config: DEFAULT_STATE,
  flashKeys: new Set(),
};

/**
 * Step controls flash the lines they change; inline terminal edits do not,
 * since the visitor is already looking at the line they type into.
 */
export function configuratorReducer(
  view: ConfiguratorView,
  action: ConfiguratorAction,
): ConfiguratorView {
  switch (action.type) {
    case "clear-flash":
      return view.flashKeys.size === 0 ? view : { ...view, flashKeys: new Set() };
    case "set": {
      const config = withSupportedModel({ ...view.config, ...action.patch });
      const flashKeys = changedLineKeys(buildConfigLines(view.config), buildConfigLines(config));
      return { config, flashKeys };
    }
    case "edit": {
      const value = action.value.replace(/\n/g, " ").slice(0, MAX_INSTRUCTIONS_LENGTH);
      return {
        config: { ...view.config, ...inlineEditPatch(action.field, value) },
        flashKeys: new Set(),
      };
    }
  }
}

function inlineEditPatch(field: EditableField, value: string): Partial<ConfiguratorState> {
  if (field === "model") {
    return { model: "custom", customModel: value.slice(0, MAX_CUSTOM_MODEL_LENGTH) };
  }
  return field === "url" ? { url: value } : { instructions: value };
}
