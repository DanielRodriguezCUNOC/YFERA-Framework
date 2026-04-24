export const proyectoInicial = {
  id: "project-yfera",
  name: "Proyecto YFERA",
};

export const arbolInicial = [
  {
    id: "folder-root",
    type: "folder",
    name: "Proyecto-YFERA",
    children: [
      {
        id: "file-sqlite",
        type: "file",
        name: "database.sqlite",
        content: `-- Base de datos SQLite del proyecto
-- Aqui se almacenara la informacion local del editor.`,
      },
      {
        id: "folder-src",
        type: "folder",
        name: "src",
        children: [
          {
            id: "file-estilos",
            type: "file",
            name: "global.styles",
            content: `base-layout {
  width = 100%;
  height = 100%;
  background color = lightgray;
  color = black;
}`,
          },
          {
            id: "file-component",
            type: "file",
            name: "app.comp",
            content: `AppComponent(string title){
  [
    <title-style>[
      text(title)
    ]
  ]
}`,
          },
          {
            id: "file-view",
            type: "file",
            name: "main.y",
            content: `import "./global.styles";
import "./app.comp";

render AppComponent("YFERA");`,
          },
        ],
      },
    ],
  },
];

export const idsCarpetasIniciales = ["folder-root", "folder-src"];
export const nodoActivoInicialId = "file-component";

export function buscarNodoPorId(nodos, idNodoBuscado) {
  let indice = 0;

  while (indice < nodos.length) {
    const nodo = nodos[indice];
    if (nodo.id === idNodoBuscado) {
      return nodo;
    }

    if (nodo.type === "folder" && nodo.children?.length) {
      const nodoEncontrado = buscarNodoPorId(nodo.children, idNodoBuscado);
      if (nodoEncontrado) {
        return nodoEncontrado;
      }
    }

    indice += 1;
  }

  return null;
}

export function actualizarContenidoArchivo(nodos, idNodoObjetivo, contenidoNuevo) {
  const nodosActualizados = [];
  let indice = 0;

  while (indice < nodos.length) {
    const nodo = nodos[indice];

    if (nodo.type === "file" && nodo.id === idNodoObjetivo) {
      nodosActualizados.push({ ...nodo, content: contenidoNuevo });
      indice += 1;
      continue;
    }

    if (nodo.type === "folder") {
      nodosActualizados.push({
        ...nodo,
        children: actualizarContenidoArchivo(
          nodo.children ?? [],
          idNodoObjetivo,
          contenidoNuevo,
        ),
      });
      indice += 1;
      continue;
    }

    nodosActualizados.push(nodo);
    indice += 1;
  }

  return nodosActualizados;
}

export const initialProject = proyectoInicial;
export const initialTree = arbolInicial;
export const defaultExpandedIds = idsCarpetasIniciales;
export const defaultActiveNodeId = nodoActivoInicialId;
export const findNodeById = buscarNodoPorId;
export const updateFileContent = actualizarContenidoArchivo;