/** Abre o leitor de PDF interno do app. `path` = caminho salvo no sistema (/uploads/doc_xxx.pdf). */
export function leitorHref(path: string, titulo: string) {
  return { pathname: '/leitor' as const, params: { src: path, titulo } };
}
