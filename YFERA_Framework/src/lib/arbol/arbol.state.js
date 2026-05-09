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
            name: "globales.styles",
            content: `/* Definición de un estilo base */
        estilo-base {
          background color = lightgray;
          color = black;
          text font = SANS;
          border = 2px solid blue;
        }

        /* Herencia de estilos */
        boton-especial extends estilo-base {
          color = white;
          background color = #333333;
          border radius = 5px;
        }

        /* Generación dinámica de clases de tamaño */
        @for $i from 1 through 3 {
          titulo-$i {
            text size = $i * 12;
            padding = 5px;
          }
}`,
          },
          {
            id: "file-component",
            type: "file",
            name: "vistas.comp",
            content: `/* Componente que recibe datos y una función */
        component miPerfil(string nombre, int edad, function alEnviar) {
    
          [ /* Sección principal con estilo */
            <estilo-base> [
              T<titulo-2>("Bienvenido, $nombre")
            
              /* Uso de lógica If para mostrar mensajes */
              if ($edad >= 18) {
                T("Eres mayor de edad")
              } else {
                T("Eres menor de edad")
              }

              /* Formulario integrado */
              FORM<boton-especial> {
                INPUT_TEXT(id: "nuevo_nombre", label: "Cambiar nombre", value: "$nombre")
                INPUT_NUMBER(id: "nueva_edad", label: "Tu edad", value: $edad)
                
                SUBMIT {
                  label: "Actualizar Datos"
                  function: $alEnviar(@nuevo_nombre, @nueva_edad)
                }
              }
            ]
          ]
}`,
          },
          {
            id: "file-view",
            type: "file",
            name: "main.y",
            content: `/* Imports de archivos externos */
        import "./globales.styles";
        import "./vistas.comp";

        /* Variables globales */
        int contador = 0;
        string usuarioActivo = "Invitado";

        /* Función de lógica que interactúa con DB */
        function guardarCambios(string nom, int ed) {
          # Ejecuta comando SQL en SQLite interno
          execute \`usuarios[nombre=$nom, edad=$ed] IN 1\`;
    
          # Recarga la vista actual
          load "./main.y";
        }

        /* Punto de entrada principal */
        main {
          # Llamada al componente usando el decorador @
          @miPerfil(usuarioActivo, 25, $guardarCambios);

          # Ciclo para mostrar múltiples elementos
          while (contador < 3) {
            contador = contador + 1;
          }
}`,
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