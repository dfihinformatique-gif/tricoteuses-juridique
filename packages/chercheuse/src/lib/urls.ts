export const urlPathFromId = (id: string): string | null =>
  /^(JORF|LEGI)ARTI\d{12}$/.test(id)
    ? `/legifrance/articles/${id}`
    : /^JORFCONT\d{12}$/.test(id)
      ? `/legifrance/journaux_officiels/${id}`
      : /^JORFDOLE\d{12}$/.test(id)
        ? `/legifrance/dossiers_legislatifs/${id}`
        : /^(JORF|LEGI)SCTA\d{12}$/.test(id)
          ? `/legifrance/sections/${id}`
          : /^(JORF|LEGI)TEXT\d{12}$/.test(id)
            ? `/legifrance/textes/${id}`
            : null
