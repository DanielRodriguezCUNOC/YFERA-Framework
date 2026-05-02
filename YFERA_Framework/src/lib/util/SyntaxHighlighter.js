/**
 * Motor de resaltado de sintaxis para YFERA.
 */
export function resaltarYfera(codigo) {
  if (!codigo) return "";

  let res = "";
  let i = 0;
  const n = codigo.length;

  const keywords = [
    "import", "execute", "load", "main", "function", "while", "for", "if", "else",
    "int", "float", "string", "boolean", "char", "component", "T", "IMG", "FORM",
    "INPUT_TEXT", "INPUT_NUMBER", "INPUT_BOOL", "SUBMIT", "id", "label", "value",
    "each", "track", "empty", "switch", "case", "default", "True", "False", "true", "false"
  ];

  while (i < n) {
    let c = codigo[i];

    // Espacios
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
      res += c;
      i++;
      continue;
    }

    // Comentarios 
    if (c === '#') {
      let comentario = "";
      while (i < n && codigo[i] !== '\n') {
        comentario += escapeHtml(codigo[i]);
        i++;
      }
      res += `<span class="token-comment">${comentario}</span>`;
      continue;
    }

    // Cadenas
    if (c === '"' || c === "'") {
      let quote = c;
      let cadena = quote;
      i++;
      while (i < n && codigo[i] !== quote) {
        if (codigo[i] === '\\' && i + 1 < n) {
          cadena += escapeHtml(codigo[i]) + escapeHtml(codigo[i + 1]);
          i += 2;
        } else {
          cadena += escapeHtml(codigo[i]);
          i++;
        }
      }
      if (i < n) {
        cadena += quote;
        i++;
      }
      res += `<span class="token-string">${cadena}</span>`;
      continue;
    }

    // Consultas DB 
    if (c === '`') {
      let dbExpr = "`";
      i++;
      while (i < n && codigo[i] !== '`') {
        dbExpr += escapeHtml(codigo[i]);
        i++;
      }
      if (i < n) {
        dbExpr += "`";
        i++;
      }
      res += `<span class="token-db">${dbExpr}</span>`;
      continue;
    }

    // Variables
    if (c === '$') {
      let variable = "$";
      i++;
      while (i < n && esAlfanumerico(codigo[i])) {
        variable += codigo[i];
        i++;
      }
      res += `<span class="token-variable">${variable}</span>`;
      continue;
    }

    // Números
    if (esDigito(c)) {
      let num = "";
      let puntoVisto = false;
      while (i < n && (esDigito(codigo[i]) || (codigo[i] === '.' && !puntoVisto))) {
        if (codigo[i] === '.') puntoVisto = true;
        num += codigo[i];
        i++;
      }
      res += `<span class="token-number">${num}</span>`;
      continue;
    }

    // Identificadores y Keywords
    if (esLetra(c)) {
      let word = "";
      while (i < n && esAlfanumerico(codigo[i])) {
        word += codigo[i];
        i++;
      }

      if (esKeyword(word, keywords)) {
        res += `<span class="token-keyword">${word}</span>`;
      } else {
        res += word;
      }
      continue;
    }

    // Símbolos de 2 caracteres
    if (i + 1 < n) {
      let c2 = c + codigo[i + 1];
      if (c2 === "==" || c2 === "!=" || c2 === "<=" || c2 === ">=" || c2 === "&&" || c2 === "||" || c2 === "++") {
        res += `<span class="token-operator">${c2}</span>`;
        i += 2;
        continue;
      }
    }

    // Símbolos de 1 carácter
    if (c === '{' || c === '}' || c === '(' || c === ')' || c === '[' || c === ']' || c === ';' || c === ',' || c === '.' || c === '@' || c === ':') {
      res += `<span class="token-symbol">${c}</span>`;
      i++;
    } else if (c === '=' || c === '+' || c === '-' || c === '*' || c === '/' || c === '<' || c === '>') {
      res += `<span class="token-operator">${c}</span>`;
      i++;
    } else {
      res += escapeHtml(c);
      i++;
    }
  }

  return res;
}

function esLetra(c) {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_';
}

function esDigito(c) {
  return c >= '0' && c <= '9';
}

function esAlfanumerico(c) {
  return esLetra(c) || esDigito(c) || c === '-';
}

function esKeyword(word, list) {
  let j = 0;
  while (j < list.length) {
    if (list[j] === word) return true;
    j++;
  }
  return false;
}

function escapeHtml(text) {
  if (text === '&') return '&amp;';
  if (text === '<') return '&lt;';
  if (text === '>') return '&gt;';
  if (text === '"') return '&quot;';
  if (text === "'") return '&#039;';
  return text;
}
