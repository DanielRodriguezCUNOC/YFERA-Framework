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
  content = content.replace(
    /const linea = yylloc\?\.[^;]+;/g,
    'const linea = (typeof yylloc !== "undefined" && yylloc) ? (yylloc.first_line || yylineno || 0) : ((typeof yylineno !== "undefined") ? yylineno : 0);'
  );
  
  content = content.replace(
    /const columna = yylloc\?\.[^;]+;/g,
    'const columna = (typeof yylloc !== "undefined" && yylloc) ? (yylloc.first_column ?? 0) : 0;'
  );

  content = content.replace(
    /const lexema = yytext \|\| '';/g,
    'const lexema = (typeof yytext !== "undefined") ? yytext : "";'
  );

  // Agregar seguridad a performAction si no está ya: inicializar variables Jison
  if (!content.includes('var yyerrok = 0, yyclearin = 0;')) {
    content = content.replace(
      /performAction:\s*function anonymous\([^)]*\)\s*\{[\s\n]*/,
      (match) => {
        return match + 'var yyerrok = 0, yyclearin = 0;\n';
      }
    );
  }

  // Extraer el nombre de la variable del parser
  const varMatch = content.match(/var\s+(\w+)\s*=\s*\(function/);
  const parserVarName = varMatch ? varMatch[1] : 'parser';

  // Remover la sección CommonJS del final si existe
  content = content.replace(
    /\n\nif \(typeof require !== 'undefined' && typeof exports !== 'undefined'\)[\s\S]*$/,
    ''
  );

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
