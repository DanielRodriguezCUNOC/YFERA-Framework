
%{
  
  var erroresLexicos = [];
  var erroresSintacticos = [];
  parser.erroresLexicos = erroresLexicos;
  parser.erroresSintacticos = erroresSintacticos;

  function resgistrarErrorLexico(lexema, linea, columna){
    erroresLexicos.push({
      tipo: 'lexico',
      lexema: lexema,
      linea: linea,
      columna: columna,
      mensaje: 'Token no reconocido: ' + lexema
    });
  }  

  function registrarErrorSintactico(mensaje, lexema, linea, columna){
    erroresSintacticos.push({
      tipo: 'sintactico',
      lexema: lexema,
      linea: linea,
      columna: columna,
      mensaje: mensaje
    });
  }

  function registrarErrorSintacticoActual(mensaje){
    var linea = (typeof yylloc !== 'undefined' && yylloc) ? (yylloc.first_line || yylineno || 0) : ((typeof yylineno !== 'undefined') ? yylineno : 0);
    var columna = (typeof yylloc !== 'undefined' && yylloc) ? (yylloc.first_column || 0) : 0;
    var lexema = (typeof yytext !== 'undefined') ? yytext : '';
    registrarErrorSintactico(mensaje, lexema, linea, columna);
  }

  parser.parseError = function(str, hash) {
    registrarErrorSintactico(str, hash.text || hash.token, hash.line + 1, (hash.loc ? hash.loc.first_column : 0));
    if (!hash.recoverable) {
      throw new Error(str);
    }
  };
%}

%lex
%options ranges yylineno
%%

\s+                              /* ignorar espacios y saltos */
[\u200B\u200C\u200D\uFEFF\u00A0]+   /* ignorar invisibles y nbsp */

/* Palabras reservadas */
"height"              return 'ALTO';
"width"               return 'ANCHO';
"min"                 return 'MINIMO';
"max"                 return 'MAXIMO';
"background"          return 'FONDO';
"color"               return 'COLOR';
"text"                return 'TEXTO';
"align"               return 'ALINEACION';
"size"                return 'SIZE';
"font"                return 'FUENTE';
"padding"             return 'PADDING';
"margin"              return 'MARGIN';
"left"                return 'LEFT';
"right"               return 'RIGHT';
"top"                 return 'TOP';
"bottom"              return 'BOTTOM';
"border"              return 'BORDE';
"radius"              return 'RADIO';
"style"               return 'STYLE';
"extends"             return 'EXTIENDE';
"@for"                return 'PARA';
"from"                return 'DESDE';
"through"             return 'HASTA';
"to"                  return 'HASTA_EXCLUYE';

/* Valores */
"CENTER"              return 'CENTER';
"RIGHT"               return 'RIGHT_VALUE';
"LEFT"                return 'LEFT_VALUE';
"HELVETICA"           return 'HELVETICA';
"SANS"                return 'SANS';
"SERIF"               return 'SERIF';
"MONO"                return 'MONO';
"CURSIVE"             return 'CURSIVE';
"DOTTED"              return 'DOTTED';
"LINE"                return 'LINE';
"DOUBLE"              return 'DOUBLE';
"SOLID"               return 'SOLID';
"rgb"                 return 'RGB';
"blue"                return 'COLOR_BLUE';
"white"               return 'COLOR_WHITE';
"red"                 return 'COLOR_RED';
"green"               return 'COLOR_GREEN';
"violet"              return 'COLOR_VIOLET';
"gray"                return 'COLOR_GRAY';
"black"               return 'COLOR_BLACK';
"lightgray"           return 'COLOR_LIGHTGRAY';

/* Literales */
"#"[0-9a-fA-F]{3}([0-9a-fA-F]{3})?      return 'COLOR_HEX';
[0-9]+("."[0-9]+)?"%"                   return 'PORCENTAJE';
[0-9]+"."[0-9]+                         return 'DECIMAL';
[0-9]+                                 return 'ENTERO';
"$"[a-zA-Z][a-zA-Z0-9]*                 return 'VARIABLE';
[a-zA-Z][a-zA-Z0-9_-]*               return 'IDENTIFICADOR';
"#"                             /* comentarios */

/* Simbolos */
"{"                   return 'LLAVE_ABRE';
"}"                   return 'LLAVE_CIERRA';
"-"                   return 'GUION';
";"                   return 'PUNTO_COMA';
"="                   return 'ASIGNAR';
"@"                   return 'DECORADOR';
"*"                   return 'MULTIPLICADOR';
"/"                   return 'SLASH';
"+"                   return 'SUMA';
"%"                   return 'MODULO';
"("                   return 'PAREN_ABRE';
")"                   return 'PAREN_CIERRA';
","                   return 'COMA';

<<EOF>>               return 'EOF';

. {
  var linea = (typeof yylloc !== 'undefined' && yylloc) ? (yylloc.first_line || yylineno || 0) : ((typeof yylineno !== 'undefined') ? yylineno : 0);
  var columna = (typeof yylloc !== 'undefined' && yylloc) ? (yylloc.first_column || 0) : 0;
  resgistrarErrorLexico(yytext, linea, columna);
}

/lex

%%

style_list
  : style_definitions EOF
    { return $1; }
  ;

style_definitions
  : style_definition
    { $$ = [$1]; }
  | style_definitions style_definition
    { $1.push($2); $$ = $1; }
  ;

style_definition
  : IDENTIFICADOR LLAVE_ABRE style_body LLAVE_CIERRA
    { $$ = { tipo: 'estilo', nombre: $1, propiedades: $3 }; }
  | IDENTIFICADOR EXTIENDE IDENTIFICADOR LLAVE_ABRE style_body LLAVE_CIERRA
    { $$ = { tipo: 'estilo', nombre: $1, heredaDe: $3, propiedades: $5 }; }
  ;

style_body
  : /* vacio */
    { $$ = []; }
  | property_list
    { $$ = $1; }
  ;

property_list
  : property
    { $$ = [$1]; }
  | property_list property
    { $1.push($2); $$ = $1; }
  ;

property
  : property_name PUNTO_COMA
    { $$ = $1; }
  | PARA variable DESDE expr_numerica_for HASTA expr_numerica_for LLAVE_ABRE property_list LLAVE_CIERRA
    { $$ = { tipo: 'para', variable: $2, inicio: $4, fin: $6, excluye: false, propiedades: $8 }; }
  | PARA variable DESDE expr_numerica_for HASTA_EXCLUYE expr_numerica_for LLAVE_ABRE property_list LLAVE_CIERRA
    { $$ = { tipo: 'para', variable: $2, inicio: $4, fin: $6, excluye: true, propiedades: $8 }; }
  ;

property_name
  : ALTO ASIGNAR valor_medida
    { $$ = { nombre: 'height', valor: $3 }; }
  | ANCHO ASIGNAR valor_medida
    { $$ = { nombre: 'width', valor: $3 }; }
  | MINIMO GUION ANCHO ASIGNAR valor_medida
    { $$ = { nombre: 'min-width', valor: $5 }; }
  | MAXIMO GUION ANCHO ASIGNAR valor_medida
    { $$ = { nombre: 'max-width', valor: $5 }; }
  | MINIMO GUION ALTO ASIGNAR valor_medida
    { $$ = { nombre: 'min-height', valor: $5 }; }
  | MAXIMO GUION ALTO ASIGNAR valor_medida
    { $$ = { nombre: 'max-height', valor: $5 }; }
  | FONDO ASIGNAR valor_color
    { $$ = { nombre: 'background', valor: $3 }; }
  | COLOR ASIGNAR valor_color
    { $$ = { nombre: 'color', valor: $3 }; }
  | TEXTO GUION ALINEACION ASIGNAR valor_alineacion
    { $$ = { nombre: 'text-align', valor: $5 }; }
  | SIZE ASIGNAR valor_medida
    { $$ = { nombre: 'font-size', valor: $3 }; }
  | FUENTE ASIGNAR valor_fuente
    { $$ = { nombre: 'font-family', valor: $3 }; }
  | PADDING ASIGNAR valor_medida
    { $$ = { nombre: 'padding', valor: $3 }; }
  | PADDING GUION LEFT ASIGNAR valor_medida
    { $$ = { nombre: 'padding-left', valor: $5 }; }
  | PADDING GUION RIGHT ASIGNAR valor_medida
    { $$ = { nombre: 'padding-right', valor: $5 }; }
  | PADDING GUION TOP ASIGNAR valor_medida
    { $$ = { nombre: 'padding-top', valor: $5 }; }
  | PADDING GUION BOTTOM ASIGNAR valor_medida
    { $$ = { nombre: 'padding-bottom', valor: $5 }; }
  | MARGIN ASIGNAR valor_medida
    { $$ = { nombre: 'margin', valor: $3 }; }
  | MARGIN GUION LEFT ASIGNAR valor_medida
    { $$ = { nombre: 'margin-left', valor: $5 }; }
  | MARGIN GUION RIGHT ASIGNAR valor_medida
    { $$ = { nombre: 'margin-right', valor: $5 }; }
  | MARGIN GUION TOP ASIGNAR valor_medida
    { $$ = { nombre: 'margin-top', valor: $5 }; }
  | MARGIN GUION BOTTOM ASIGNAR valor_medida
    { $$ = { nombre: 'margin-bottom', valor: $5 }; }
  | BORDE ASIGNAR valor_borde
    { $$ = { nombre: 'border', valor: $3 }; }
  | BORDE GUION RADIO ASIGNAR valor_medida
    { $$ = { nombre: 'border-radius', valor: $5 }; }
  ;

valor_medida
  : ENTERO
    { $$ = { unidad: 'px', valor: parseInt($1) }; }
  | DECIMAL
    { $$ = { unidad: 'px', valor: parseFloat($1) }; }
  | PORCENTAJE
    { $$ = { unidad: '%', valor: parseFloat($1) }; }
  ;

valor_color
  : COLOR_HEX
    { $$ = $1; }
  | RGB PAREN_ABRE ENTERO COMA ENTERO COMA ENTERO PAREN_CIERRA
    { $$ = 'rgb(' + $3 + ',' + $5 + ',' + $7 + ')'; }
  | COLOR_BLUE   { $$ = 'blue'; }
  | COLOR_WHITE  { $$ = 'white'; }
  | COLOR_RED    { $$ = 'red'; }
  | COLOR_GREEN  { $$ = 'green'; }
  | COLOR_VIOLET { $$ = 'violet'; }
  | COLOR_GRAY   { $$ = 'gray'; }
  | COLOR_BLACK  { $$ = 'black'; }
  | COLOR_LIGHTGRAY { $$ = 'lightgray'; }
  ;

valor_alineacion
  : CENTER      { $$ = 'center'; }
  | RIGHT_VALUE { $$ = 'right'; }
  | LEFT_VALUE  { $$ = 'left'; }
  ;

valor_fuente
  : HELVETICA { $$ = 'Helvetica'; }
  | SANS      { $$ = 'sans-serif'; }
  | SERIF     { $$ = 'serif'; }
  | MONO      { $$ = 'monospace'; }
  | CURSIVE   { $$ = 'cursive'; }
  ;

valor_borde
  : valor_medida tipo_borde valor_color
    { $$ = $1.valor + $1.unit + ' ' + $2 + ' ' + $3; }
  ;

tipo_borde
  : DOTTED { $$ = 'dotted'; }
  | LINE   { $$ = 'dashed'; }
  | DOUBLE { $$ = 'double'; }
  | SOLID  { $$ = 'solid'; }
  ;

numero
  : ENTERO
    { $$ = parseInt($1); }
  | DECIMAL
    { $$ = parseFloat($1); }
  ;

variable
  : VARIABLE
    { $$ = $1; }
  ;

expr_numerica_for
  : termino_numerico_for
    { $$ = $1; }
  | expr_numerica_for SUMA termino_numerico_for
    { $$ = { op: '+', left: $1, right: $3 }; }
  | expr_numerica_for GUION termino_numerico_for
    { $$ = { op: '-', left: $1, right: $3 }; }
  ;

termino_numerico_for
  : factor_numerico_for
    { $$ = $1; }
  | termino_numerico_for MULTIPLICADOR factor_numerico_for
    { $$ = { op: '*', left: $1, right: $3 }; }
  | termino_numerico_for SLASH factor_numerico_for
    { $$ = { op: '/', left: $1, right: $3 }; }
  | expr_numerica_for MODULO termino_numerico_for
    {$$ = { op: '%', left: $1, right: $3 }; }
  ;

factor_numerico_for
  : numero
    { $$ = $1; }
  | variable
    { $$ = $1; }
  | PAREN_ABRE expr_numerica_for PAREN_CIERRA
    { $$ = $2; }
  ;
