/**
 * Generador de código para la lógica principal de YFERA.
 * Traduce sentencias de renderizado, declaraciones, funciones y control de flujo a JavaScript.
 */

function quitarComillasGraves(texto) {
  if (typeof texto !== 'string' || texto.length < 2) {
    return texto;
  }

  if (texto.charAt(0) === '`' && texto.charAt(texto.length - 1) === '`') {
    return texto.substring(1, texto.length - 1);
  }

  return texto;
}

function convertirVariablesParaPlantilla(texto) {
  if (typeof texto !== 'string' || texto.length === 0) {
    return texto;
  }

  let resultado = '';
  let indice = 0;

  while (indice < texto.length) {
    const caracter = texto.charAt(indice);

    if (caracter === '$') {
      let siguiente = indice + 1;
      let nombre = '';

      while (siguiente < texto.length) {
        const actual = texto.charAt(siguiente);
        const esLetra = (actual >= 'A' && actual <= 'Z') || (actual >= 'a' && actual <= 'z');
        const esGuionBajo = actual === '_';
        const esNumero = actual >= '0' && actual <= '9';
        const esPrimerCaracterValido = nombre.length === 0 ? (esLetra || esGuionBajo) : (esLetra || esGuionBajo || esNumero);

        if (!esPrimerCaracterValido) {
          break;
        }

        nombre += actual;
        siguiente += 1;
      }

      if (nombre.length > 0) {
        resultado += '${' + nombre + '}';
        indice = siguiente;
        continue;
      }
    }

    resultado += caracter;
    indice += 1;
  }

  return resultado;
}

function esIdentificadorBasico(valor) {
  if (typeof valor !== 'string' || valor.length === 0) {
    return false;
  }

  let indice = 0;
  while (indice < valor.length) {
    const caracter = valor.charAt(indice);
    const esLetra = (caracter >= 'A' && caracter <= 'Z') || (caracter >= 'a' && caracter <= 'z');
    const esGuionBajo = caracter === '_';
    const esNumero = caracter >= '0' && caracter <= '9';

    if (indice === 0) {
      if (!esLetra && !esGuionBajo) {
        return false;
      }
    } else if (!esLetra && !esGuionBajo && !esNumero) {
      return false;
    }

    indice += 1;
  }

  return true;
}

function esNumeroTextoBasico(valor) {
  if (typeof valor !== 'string' || valor.length === 0) {
    return false;
  }

  let indice = 0;
  let tienePunto = false;

  if (valor.charAt(0) === '-') {
    if (valor.length === 1) {
      return false;
    }
    indice = 1;
  }

  while (indice < valor.length) {
    const caracter = valor.charAt(indice);

    if (caracter === '.') {
      if (tienePunto) {
        return false;
      }
      tienePunto = true;
      indice += 1;
      continue;
    }

    if (!(caracter >= '0' && caracter <= '9')) {
      return false;
    }

    indice += 1;
  }

  return true;
}

function esCadenaCitada(valor) {
  if (typeof valor !== 'string' || valor.length < 2) {
    return false;
  }

  const primerCaracter = valor.charAt(0);
  const ultimoCaracter = valor.charAt(valor.length - 1);

  if (primerCaracter === '"' && ultimoCaracter === '"') {
    return true;
  }

  if (primerCaracter === '\'' && ultimoCaracter === '\'') {
    return true;
  }

  if (primerCaracter === '`' && ultimoCaracter === '`') {
    return true;
  }

  return false;
}

function esNumeroBasico(valor) {
  return esNumeroTextoBasico(valor);
}

function normalizarNombreTipo(tipo) {
  if (typeof tipo !== 'string') {
    return '';
  }

  let resultado = '';
  let indice = 0;
  while (indice < tipo.length) {
    const caracter = tipo.charAt(indice);
    if (caracter >= 'A' && caracter <= 'Z') {
      resultado += caracter.toLowerCase();
    } else {
      resultado += caracter;
    }
    indice += 1;
  }

  return resultado;
}

function esTipoConvertible(tipo) {
  const normalizado = normalizarNombreTipo(tipo);
  return normalizado === 'int' || normalizado === 'float' || normalizado === 'string' || normalizado === 'boolean' || normalizado === 'char';
}

function unirConComas(valores) {
  let texto = '';
  let indice = 0;

  while (indice < valores.length) {
    if (indice > 0) {
      texto += ', ';
    }

    texto += valores[indice];
    indice += 1;
  }

  return texto;
}

class GeneradorLogica {
  constructor() {
    this.codigoRender = '';
  }

  normalizarPrograma(ast) {
    if (Array.isArray(ast)) {
      return {
        imports: [],
        declaraciones: [],
        funciones: [],
        main: { tipo: 'main', sentencias: ast },
      };
    }

    if (!ast || typeof ast !== 'object') {
      return { imports: [], declaraciones: [], funciones: [], main: { tipo: 'main', sentencias: [] } };
    }

    if (ast.tipo === 'programa') {
      return {
        imports: Array.isArray(ast.imports) ? ast.imports : [],
        declaraciones: Array.isArray(ast.declaraciones) ? ast.declaraciones : [],
        funciones: Array.isArray(ast.funciones) ? ast.funciones : [],
        main: ast.main && typeof ast.main === 'object' ? ast.main : { tipo: 'main', sentencias: [] },
      };
    }

    if (ast.tipo === 'main') {
      return { imports: [], declaraciones: [], funciones: [], main: ast };
    }

    return {
      imports: Array.isArray(ast.imports) ? ast.imports : [],
      declaraciones: Array.isArray(ast.declaraciones) ? ast.declaraciones : [],
      funciones: Array.isArray(ast.funciones) ? ast.funciones : [],
      main: ast.main && typeof ast.main === 'object' ? ast.main : { tipo: 'main', sentencias: [] },
    };
  }

  obtenerSentenciasMain(main) {
    if (!main) return [];
    if (Array.isArray(main)) return main;
    if (Array.isArray(main.sentencias)) return main.sentencias;
    if (Array.isArray(main.cuerpo)) return main.cuerpo;
    return [];
  }

  generar(ast) {
    const programa = this.normalizarPrograma(ast);

    let codigo = '// Lógica principal YFERA\n';
    codigo += this.generarCabeceraRuntime() + '\n\n';

    if (programa.declaraciones.length > 0) {
      codigo += '// Declaraciones globales\n';
      codigo += this.generarListaDeclaraciones(programa.declaraciones) + '\n\n';
    }

    if (programa.funciones.length > 0) {
      codigo += '// Funciones globales\n';
      codigo += this.generarListaFunciones(programa.funciones) + '\n\n';
    }

    const sentenciasMain = this.obtenerSentenciasMain(programa.main);
    codigo += 'window.addEventListener("load", async () => {\n';
    codigo += this.generarBloqueSentencias(sentenciasMain, 2, { contexto: 'main' });
    codigo += '});\n';

    return codigo;
  }

  generarCabeceraRuntime() {
    let codigo = '';
    codigo += 'const __yferaAppContainer = () => (typeof document !== "undefined" ? document.getElementById("app") : null);\n';
    codigo += 'const __yferaTiposDeclarados = Object.create(null);\n';
    codigo += 'const __yferaRegistrarTipo = (nombre, tipo) => { if (nombre) { __yferaTiposDeclarados[nombre] = tipo; } return tipo; };\n';
    codigo += 'const __yferaObtenerTipo = (nombre) => (nombre && __yferaTiposDeclarados[nombre] ? __yferaTiposDeclarados[nombre] : "");\n';
    codigo += 'const __yferaNormalizarTipo = (tipo) => { if (typeof tipo !== "string") return ""; let salida = ""; let indice = 0; while (indice < tipo.length) { const caracter = tipo.charAt(indice); salida += (caracter >= "A" && caracter <= "Z") ? caracter.toLowerCase() : caracter; indice += 1; } return salida; };\n';
    codigo += 'const __yferaConvertirTipo = (tipo, valor) => {\n';
    codigo += '  const __tipo = __yferaNormalizarTipo(tipo);\n';
    codigo += '  if (__tipo === "int") {\n';
    codigo += '    if (typeof valor === "number") return Math.trunc(valor);\n';
    codigo += '    const texto = valor === null || valor === undefined ? "" : String(valor).trim();\n';
    codigo += '    if (texto.length === 0) return 0;\n';
    codigo += '    const numero = Number.parseInt(texto, 10);\n';
    codigo += '    return Number.isNaN(numero) ? 0 : numero;\n';
    codigo += '  }\n';
    codigo += '  if (__tipo === "float") {\n';
    codigo += '    if (typeof valor === "number") return valor;\n';
    codigo += '    const texto = valor === null || valor === undefined ? "" : String(valor).trim();\n';
    codigo += '    if (texto.length === 0) return 0;\n';
    codigo += '    const numero = Number.parseFloat(texto);\n';
    codigo += '    return Number.isNaN(numero) ? 0 : numero;\n';
    codigo += '  }\n';
    codigo += '  if (__tipo === "string") {\n';
    codigo += '    if (valor === null || valor === undefined) return "";\n';
    codigo += '    return String(valor);\n';
    codigo += '  }\n';
    codigo += '  if (__tipo === "boolean") {\n';
    codigo += '    if (typeof valor === "boolean") return valor;\n';
    codigo += '    if (typeof valor === "number") return valor !== 0;\n';
    codigo += '    const texto = valor === null || valor === undefined ? "" : String(valor).trim();\n';
    codigo += '    const normalizado = texto.toLowerCase();\n';
    codigo += '    if (normalizado === "true" || normalizado === "1" || normalizado === "si" || normalizado === "sí") return true;\n';
    codigo += '    if (normalizado === "false" || normalizado === "0" || normalizado === "no") return false;\n';
    codigo += '    return Boolean(valor);\n';
    codigo += '  }\n';
    codigo += '  if (__tipo === "char") {\n';
    codigo += '    if (valor === null || valor === undefined) return "";\n';
    codigo += '    const texto = String(valor);\n';
    codigo += '    return texto.length > 0 ? texto.charAt(0) : "";\n';
    codigo += '  }\n';
    codigo += '  return valor;\n';
    codigo += '};\n';
    codigo += 'const __yferaAplicarTipoDeclarado = (nombre, valor) => { const __tipo = __yferaObtenerTipo(nombre); return __tipo ? __yferaConvertirTipo(__tipo, valor) : valor; };\n';
    codigo += 'const __yferaMountResultado = (resultado) => {\n';
    codigo += '  const app = __yferaAppContainer();\n';
    codigo += '  if (!app || resultado === null || resultado === undefined) return resultado;\n';
    codigo += '  if (typeof resultado === "string") { app.insertAdjacentHTML("beforeend", resultado); return resultado; }\n';
    codigo += '  if (typeof DocumentFragment !== "undefined" && resultado instanceof DocumentFragment) { app.appendChild(resultado); return resultado; }\n';
    codigo += '  if (resultado && resultado.nodeType) { app.appendChild(resultado); return resultado; }\n';
    codigo += '  if (Array.isArray(resultado)) {\n';
    codigo += '    let __indiceResultado = 0;\n';
    codigo += '    while (__indiceResultado < resultado.length) {\n';
    codigo += '      __yferaMountResultado(resultado[__indiceResultado]);\n';
    codigo += '      __indiceResultado += 1;\n';
    codigo += '    }\n';
    codigo += '    return resultado;\n';
    codigo += '  }\n';
    codigo += '  try { app.appendChild(resultado); } catch (error) { console.error("No se pudo montar el resultado", error); }\n';
    codigo += '  return resultado;\n';
    codigo += '};';
    return codigo;
  }

  generarListaDeclaraciones(declaraciones) {
    let codigo = '';
    let i = 0;
    while (i < declaraciones.length) {
      const decl = declaraciones[i];
      if (decl) {
        codigo += this.generarDeclaracionTopLevel(decl) + '\n';
      }
      i += 1;
    }
    return codigo.trimEnd();
  }

  generarListaFunciones(funciones) {
    let codigo = '';
    let i = 0;
    while (i < funciones.length) {
      const fn = funciones[i];
      if (fn) {
        codigo += this.generarFuncionTopLevel(fn) + '\n';
      }
      i += 1;
    }
    return codigo.trimEnd();
  }

  generarFuncionTopLevel(nodo) {
    const nombre = nodo.nombre || 'funcionAnonima';
    const parametros = [];
    const conversionesParametros = [];
    let indiceParametro = 0;

    if (Array.isArray(nodo.parametros)) {
      while (indiceParametro < nodo.parametros.length) {
        const parametro = nodo.parametros[indiceParametro];
        if (parametro && parametro.id) {
          parametros.push(parametro.id);
          if (parametro.tipo && esTipoConvertible(parametro.tipo)) {
            conversionesParametros.push(`  ${parametro.id} = __yferaConvertirTipo('${normalizarNombreTipo(parametro.tipo)}', ${parametro.id});`);
          }
        }
        indiceParametro += 1;
      }
    }

    const params = unirConComas(parametros);
    const sentencias = Array.isArray(nodo.sentencias) ? nodo.sentencias : [];

    let codigo = `async function ${nombre}(${params}) {\n`;
    if (conversionesParametros.length > 0) {
      let indiceConversion = 0;
      while (indiceConversion < conversionesParametros.length) {
        codigo += conversionesParametros[indiceConversion] + '\n';
        indiceConversion += 1;
      }
    }
    codigo += this.generarBloqueSentencias(sentencias, 2, { contexto: 'funcion', nombreFuncion: nombre });
    codigo += `}\n`;
    codigo += `if (typeof YFERA !== 'undefined' && YFERA && typeof YFERA.registerFunction === 'function') { YFERA.registerFunction('${nombre}', ${nombre}); }\n`;
    return codigo;
  }

  generarDeclaracionTopLevel(nodo, indentSize = 0) {
    const indent = ' '.repeat(indentSize);

    switch (nodo.tipo) {
      case 'declaracion':
        return `${indent}__yferaRegistrarTipo('${nodo.id}', '${normalizarNombreTipo(nodo.dato || nodo.tipoDato || '')}');\n${indent}let ${nodo.id} = __yferaConvertirTipo('${normalizarNombreTipo(nodo.dato || nodo.tipoDato || '')}', ${this.generarExpresion(nodo.valor)});`;
      case 'arreglo_tamanio':
        return `${indent}__yferaRegistrarTipo('${nodo.id}', '${normalizarNombreTipo(nodo.dato || nodo.tipoDato || '')}');\n${indent}let ${nodo.id} = new Array(${this.generarExpresion(nodo.valor?.size ?? nodo.valor)});`;
      case 'arreglo_literal': {
        const elementos = [];
        let indiceElemento = 0;

        if (Array.isArray(nodo.valor)) {
          while (indiceElemento < nodo.valor.length) {
            elementos.push(this.generarExpresion(nodo.valor[indiceElemento]));
            indiceElemento += 1;
          }
        }

        const items = unirConComas(elementos);
        return `${indent}__yferaRegistrarTipo('${nodo.id}', '${normalizarNombreTipo(nodo.dato || nodo.tipoDato || '')}');\n${indent}let ${nodo.id} = [${items}];`;
      }
      case 'arreglo_execute': {
        const query = this.generarConsultaSql(nodo.consulta);
        return `${indent}__yferaRegistrarTipo('${nodo.id}', '${normalizarNombreTipo(nodo.dato || nodo.tipoDato || '')}');\n${indent}let ${nodo.id} = (typeof YFERA !== 'undefined' && YFERA && typeof YFERA.executeDB === 'function') ? (YFERA.executeDB('raw', ${query}).rows || []) : [];`;
      }
      default:
        return `${indent}// Declaración no implementada: ${nodo.tipo}`;
    }
  }

  generarBloqueSentencias(sentencias, indentSize = 0, contexto = {}) {
    if (!Array.isArray(sentencias) || sentencias.length === 0) {
      return `${' '.repeat(indentSize)}// bloque vacío\n`;
    }

    let codigo = '';
    let i = 0;
    while (i < sentencias.length) {
      const sentencia = sentencias[i];
      if (sentencia) {
        codigo += this.generarSentencia(sentencia, indentSize, contexto) + '\n';
      }
      i += 1;
    }
    return codigo;
  }

  generarSentencia(nodo, indentSize = 0, contexto = {}) {
    const indent = ' '.repeat(indentSize);
    if (!nodo) return `${indent}// sentencia vacía`;

    switch (nodo.tipo) {
      case 'invocacion':
      case 'render':
        return this.generarSentenciaInvocacion(nodo, indent);

      case 'asignacion':
        return `${indent}${this.generarDestinoAsignacion(nodo.target)} = ${this.generarValorConTipo(nodo.target, nodo.valor)};`;

      case 'execute':
        return `${indent}{ const __resultadoExecute = (typeof YFERA !== 'undefined' && typeof YFERA.executeDB === 'function') ? YFERA.executeDB('raw', ${this.generarConsultaSql(nodo.consulta)}) : null; if (typeof YFERA !== 'undefined' && YFERA && typeof YFERA.setGlobal === 'function') { YFERA.setGlobal('__lastExecute', __resultadoExecute); } }`;

      case 'load':
        return `${indent}await (typeof YFERA !== 'undefined' && typeof YFERA.load === 'function' ? YFERA.load(${this.generarExpresion(nodo.valor)}) : Promise.resolve());`;

      case 'while': {
        const cuerpo = this.obtenerCuerpoSentencias(nodo);
        let codigo = `${indent}while (${this.generarExpresion(nodo.condicion)}) {\n`;
        codigo += this.generarBloqueSentencias(cuerpo, indentSize + 2, contexto);
        codigo += `${indent}}`;
        return codigo;
      }

      case 'do_while': {
        const cuerpo = this.obtenerCuerpoSentencias(nodo);
        let codigo = `${indent}do {\n`;
        codigo += this.generarBloqueSentencias(cuerpo, indentSize + 2, contexto);
        codigo += `${indent}} while (${this.generarExpresion(nodo.condicion)});`;
        return codigo;
      }

      case 'for': {
        const init = this.generarForEncabezado(nodo.init);
        const condicion = this.generarExpresion(nodo.condicion);
        const paso = this.generarForPaso(nodo.paso);
        const cuerpo = this.obtenerCuerpoSentencias(nodo);
        let codigo = `${indent}for (${init}; ${condicion}; ${paso}) {\n`;
        codigo += this.generarBloqueSentencias(cuerpo, indentSize + 2, contexto);
        codigo += `${indent}}`;
        return codigo;
      }

      case 'switch': {
        const casos = Array.isArray(nodo.casos) ? nodo.casos : [];
        let codigo = `${indent}switch (${this.generarExpresion(nodo.expresion)}) {\n`;
        let i = 0;
        while (i < casos.length) {
          const caso = casos[i];
          if (caso && caso.tipo === 'case') {
            codigo += `${indent}  case ${this.generarExpresion(caso.valor)}:\n`;
            codigo += this.generarBloqueSentencias(this.obtenerCuerpoSentencias(caso), indentSize + 4, { ...contexto, enSwitch: true });
            if (!this.tieneBreakFinal(this.obtenerCuerpoSentencias(caso))) {
              codigo += `${indent}    break;\n`;
            }
          } else if (caso && caso.tipo === 'default') {
            codigo += `${indent}  default:\n`;
            codigo += this.generarBloqueSentencias(this.obtenerCuerpoSentencias(caso), indentSize + 4, { ...contexto, enSwitch: true });
            if (!this.tieneBreakFinal(this.obtenerCuerpoSentencias(caso))) {
              codigo += `${indent}    break;\n`;
            }
          }
          i += 1;
        }
        codigo += `${indent}}`;
        return codigo;
      }

      case 'if': {
        const entonces = this.obtenerCuerpoSentencias(nodo, 'then');
        const sino = this.obtenerCuerpoSentencias(nodo, 'else');
        const elseIfs = Array.isArray(nodo.elseIfs) ? nodo.elseIfs : [];
        let codigo = `${indent}if (${this.generarExpresion(nodo.condicion)}) {\n`;
        codigo += this.generarBloqueSentencias(entonces, indentSize + 2, contexto);
        codigo += `${indent}}`;

        let i = 0;
        while (i < elseIfs.length) {
          const parte = elseIfs[i];
          codigo += ` else if (${this.generarExpresion(parte.condicion)}) {\n`;
          codigo += this.generarBloqueSentencias(this.obtenerCuerpoSentencias(parte), indentSize + 2, contexto);
          codigo += `${indent}}`;
          i += 1;
        }

        if (Array.isArray(sino) && sino.length > 0) {
          codigo += ` else {\n`;
          codigo += this.generarBloqueSentencias(sino, indentSize + 2, contexto);
          codigo += `${indent}}`;
        }

        return codigo;
      }

      case 'break':
        return `${indent}break;`;

      case 'declaracion':
      case 'arreglo_tamanio':
      case 'arreglo_literal':
      case 'arreglo_execute':
        return this.generarDeclaracionTopLevel(nodo, indentSize);

      default:
        return `${indent}// Sentencia principal no implementada: ${nodo.tipo}`;
    }
  }

  generarSentenciaInvocacion(nodo, indent) {
    const nombreComp = nodo.componente || nodo.nombre || '';
    const argumentos = [];

    if (Array.isArray(nodo.args)) {
      let indice = 0;
      while (indice < nodo.args.length) {
        argumentos.push(this.generarExpresion(nodo.args[indice]));
        indice += 1;
      }
    }

    const args = unirConComas(argumentos);
    const argsInvocacion = args.length > 0 ? `, ${args}` : '';
    const argsDirectos = args.length > 0 ? args : '';

    return `${indent}{\n` +
      `${indent}  const __resultComp = (typeof YFERA !== 'undefined' && YFERA && typeof YFERA.execute === 'function') ? YFERA.execute('${nombreComp}'${argsInvocacion}) : ${nombreComp}(${argsDirectos});\n` +
      `${indent}  __yferaMountResultado(__resultComp);\n` +
      `${indent}}`;
  }

  generarValorConTipo(destino, expresion) {
    const nombreDestino = this.obtenerNombreDestinoSimple(destino);
    const valorGenerado = this.generarExpresion(expresion);

    if (!nombreDestino) {
      return valorGenerado;
    }

    return `__yferaAplicarTipoDeclarado('${nombreDestino}', ${valorGenerado})`;
  }

  obtenerNombreDestinoSimple(destino) {
    if (!destino || typeof destino !== 'object') {
      return typeof destino === 'string' ? destino : '';
    }

    if (destino.tipo === 'id') {
      return destino.valor || '';
    }

    return '';
  }

  obtenerCuerpoSentencias(nodo, preferencia = 'cuerpo') {
    if (!nodo || typeof nodo !== 'object') return [];
    if (preferencia === 'then' && Array.isArray(nodo.then)) return nodo.then;
    if (preferencia === 'else' && Array.isArray(nodo.else)) return nodo.else;
    if (Array.isArray(nodo.cuerpo)) return nodo.cuerpo;
    if (Array.isArray(nodo.then)) return nodo.then;
    if (Array.isArray(nodo.sentencias)) return nodo.sentencias;
    if (Array.isArray(nodo.else)) return nodo.else;
    return [];
  }

  tieneBreakFinal(sentencias) {
    if (!Array.isArray(sentencias) || sentencias.length === 0) return false;
    const ultimo = sentencias[sentencias.length - 1];
    return ultimo && ultimo.tipo === 'break';
  }

  generarForEncabezado(init) {
    if (!init) return '';
    if (init.tipo === 'asignacion') {
      return `${this.generarDestinoAsignacion(init.target)} = ${this.generarExpresion(init.valor)}`;
    }
    if (init.tipo === 'declaracion') {
      return `let ${init.id} = ${this.generarExpresion(init.valor)}`;
    }
    return this.generarExpresion(init);
  }

  generarForPaso(paso) {
    if (!paso) return '';
    if (paso.tipo === 'asignacion') {
      return `${this.generarDestinoAsignacion(paso.target)} = ${this.generarExpresion(paso.valor)}`;
    }
    if (paso.tipo === 'post_increment_assign') {
      return `${paso.id} = ${paso.valor}++`;
    }
    if (paso.tipo === 'post_increment') {
      return `${paso.id}++`;
    }
    return this.generarExpresion(paso);
  }

  generarDestinoAsignacion(target) {
    if (!target) return '/* destino inválido */';
    if (typeof target === 'string') return target;
    if (target.tipo === 'id') return target.valor;
    if (target.tipo === 'acceso_arreglo') {
      return `${target.id}[${this.generarExpresion(target.indice)}]`;
    }
    return this.generarExpresion(target);
  }

  generarConsultaSql(consulta) {
    let q = consulta || '';
    if (typeof q === 'string') q = quitarComillasGraves(q);
    q = convertirVariablesParaPlantilla(String(q));
    return '`' + q + '`';
  }

  generarExpresion(expr) {
    if (expr === null || expr === undefined) return 'null';
    if (typeof expr === 'number' || typeof expr === 'boolean') return String(expr);

    if (typeof expr === 'string') {
      if (esCadenaCitada(expr) || esNumeroBasico(expr)) return expr;
      if (esIdentificadorBasico(expr)) return expr;
      return JSON.stringify(expr);
    }

    if (Array.isArray(expr)) {
      let contenido = '';
      let indice = 0;

      while (indice < expr.length) {
        if (indice > 0) {
          contenido += ', ';
        }
        contenido += this.generarExpresion(expr[indice]);
        indice += 1;
      }

      return `[${contenido}]`;
    }

    if (typeof expr === 'object') {
      if (expr.tipo === 'id') return expr.valor;
      if (expr.tipo === 'acceso_arreglo') return `${expr.id}[${this.generarExpresion(expr.indice)}]`;
      if (expr.op) return `(${this.generarExpresion(expr.left)} ${expr.op} ${this.generarExpresion(expr.right)})`;
      if (expr.valor !== undefined) return this.generarExpresion(expr.valor);
      if (expr.size !== undefined) return this.generarExpresion(expr.size);
    }

    return JSON.stringify(expr);
  }
}

export const generadorLogica = new GeneradorLogica();
export default GeneradorLogica;