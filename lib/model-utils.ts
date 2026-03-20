export const normalizeUniqueModelNames = (models: Iterable<unknown>): string[] => {
  const normalizedModels: string[] = [];
  const seenModels = new Set<string>();

  for (const model of models) {
    if (typeof model !== "string") {
      continue;
    }

    const normalizedModel = model.trim();
    if (!normalizedModel || seenModels.has(normalizedModel)) {
      continue;
    }

    seenModels.add(normalizedModel);
    normalizedModels.push(normalizedModel);
  }

  return normalizedModels;
};

export const getVisibleModelNames = ({
  baseModels,
  customModels = [],
  hiddenModels = [],
}: {
  baseModels: Iterable<unknown>;
  customModels?: Iterable<unknown>;
  hiddenModels?: readonly string[];
}): string[] => {
  const hiddenModelSet = new Set(hiddenModels);

  return normalizeUniqueModelNames([
    ...Array.from(baseModels).filter(
      (model): model is string => typeof model === "string" && !hiddenModelSet.has(model.trim()),
    ),
    ...Array.from(customModels).filter(
      (model): model is string => typeof model === "string" && !hiddenModelSet.has(model.trim()),
    ),
  ]);
};
