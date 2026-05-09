#!/usr/bin/env node

/**
 * Post-procesamiento: Convierte parsers CommonJS de Jison a ES modules
 * y corrige referencias a variables Jison en el código del usuario.
 * Es IDEMPOTENTE: no agrega exportaciones si ya existen.
 */

import fs from 'fs';
import path from 'path';

const parserDir = './src/lib/gramatica/lexer-parser';
const files = [
  'grammar-styles.js',
  'grammar-components.js',
  'grammar-DB.js',
  'principal-grammar.js'
];

files.forEach(file => {
  const filePath = path.join(parserDir, file);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  ${file} no existe, saltando`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Corregir referencias a yylloc en funciones del usuario (bloque %{...%})
  //* buscamos las declaraciones y sustituimos hasta el siguiente ;.
  let buscarYSustituir = [
    {
      clave: 'const linea =',
      remplazo: 'const linea = (typeof yylloc !== "undefined" && yylloc) ? (yylloc.first_line || yylineno || 0) : ((typeof yylineno !== "undefined") ? yylineno : 0);'
    },
    {
      clave: 'const columna =',
      remplazo: 'const columna = (typeof yylloc !== "undefined" && yylloc) ? (yylloc.first_column ?? 0) : 0;'
    },
    {
      clave: "const lexema =",
      remplazo: 'const lexema = (typeof yytext !== "undefined") ? yytext : "";'
    }
  ];

  for (const item of buscarYSustituir) {
    let idx = content.indexOf(item.clave);
    while (idx !== -1) {
      const semi = content.indexOf(';', idx);
      if (semi === -1) break;
      content = content.slice(0, idx) + item.remplazo + content.slice(semi + 1);
      idx = content.indexOf(item.clave, idx + 1);
    }
  }

  // * inicializar variables Jison
  if (!content.includes('var yyerrok = 0, yyclearin = 0;')) {
    const key = 'performAction:';
    let p = content.indexOf(key);
    if (p !== -1) {
      const funcPos = content.indexOf('function anonymous', p);
      if (funcPos !== -1) {
        const bracePos = content.indexOf('{', funcPos);
        if (bracePos !== -1) {
          content = content.slice(0, bracePos + 1) + '\nvar yyerrok = 0, yyclearin = 0;\n' + content.slice(bracePos + 1);
        }
      }
    }
  }

  //* Extraer el nombre de la variable del parser
  let parserVarName = 'parser';
  let searchIdx = 0;
  while (true) {
    const vIdx = content.indexOf('var ', searchIdx);
    if (vIdx === -1) break;
    let nameStart = vIdx + 4;
    // leer identificador
    let nameEnd = nameStart;
    while (nameEnd < content.length) {
      const ch = content[nameEnd];
      const isWord = (ch >= '0' && ch <= '9') || (ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z') || ch === '_';
      if (isWord) nameEnd++; else break;
    }
    const candidate = content.substring(nameStart, nameEnd);
    const rest = content.substring(nameEnd, nameEnd + 20);
    if (rest.indexOf('= (function') !== -1 || rest.indexOf('=(function') !== -1) {
      parserVarName = candidate || 'parser';
      break;
    }
    searchIdx = nameEnd + 1;
  }

  //* Remover la sección CommonJS del final si existe
  const commonjsKey = "\n\nif (typeof require !== 'undefined' && typeof exports !== 'undefined')";
  const commonIdx = content.indexOf(commonjsKey);
  if (commonIdx !== -1) {
    content = content.substring(0, commonIdx);
  }

  // Agregar exportación ES module al final si no existe
  if (!content.includes('export const parser')) {
    content += `

export const parser = ${parserVarName};
export const Parser = ${parserVarName}.Parser;
export function parse(input) {
  return ${parserVarName}.parse(input);
}
`;
  } else {
    // Si ya existe, nos aseguramos de que solo haya una instancia al final
    // (Limpiamos posibles duplicados previos causados por errores)
    const exportBase = `export const parser = ${parserVarName};`;
    const parts = content.split(exportBase);
    if (parts.length > 2) {
      content = parts[0] + exportBase + parts[parts.length - 1].split('}')[1] || ''; // Muy rústico
      // Mejor: Solo tomamos hasta el primer export y agregamos el bloque limpio
      const firstExportIndex = content.indexOf('export const parser');
      content = content.substring(0, firstExportIndex) + `
export const parser = ${parserVarName};
export const Parser = ${parserVarName}.Parser;
export function parse(input) {
  return ${parserVarName}.parse(input);
}
`;
    }
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✓ ${file} procesado`);
});

console.log('\n✓ Post-compilación completada');
