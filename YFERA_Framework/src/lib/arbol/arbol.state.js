export const initialProject = {
  id: "project-yfera",
  name: "Proyecto YFERA",
};

export const initialTree = [
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

export const defaultExpandedIds = ["folder-root", "folder-src"];
export const defaultActiveNodeId = "file-component";

export function findNodeById(nodes, targetId) {
  for (const node of nodes) {
    if (node.id === targetId) return node;
    if (node.type === "folder" && node.children?.length) {
      const found = findNodeById(node.children, targetId);
      if (found) return found;
    }
  }
  return null;
}

export function updateFileContent(nodes, targetId, content) {
  return nodes.map((node) => {
    if (node.type === "file" && node.id === targetId) {
      return { ...node, content };
    }

    if (node.type === "folder") {
      return {
        ...node,
        children: updateFileContent(node.children ?? [], targetId, content),
      };
    }

    return node;
  });
}