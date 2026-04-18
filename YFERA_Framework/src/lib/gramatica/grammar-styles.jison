/*
* Analizador Lexico
*/


%{

  const erroresLexicos = [];
  const erroresSintacticos = [];

  function resgistrarErrorLexico(lexema, linea, columna){
    erroresLexicos.push({
      tipo: 'lexico',
      lexema,
      linea,
      columna,
      mensaje: `Token no reconocido: ${lexema}`
    });
  }  

  function registrarErrorSintactico(mensaje, lexema, linea, columna){
    erroresSintacticos.push({
      tipo: 'sintactico',
      lexema,
      linea,
      columna,
      mensaje
    });
  }

  function registrarErrorSintacticoActual(mensaje){
    const linea = yylloc?.first_line || yylineno || 0;
    const columna = yylloc?.first_column ?? 0;
    const lexema = yytext || '';
    registrarErrorSintactico(mensaje, lexema, linea, columna);
  }
%}

%lex
%options ranges yylineno
%%

\s+                              /* ignorar espacios y saltos */
[\u200B\u200C\u200D\uFEFF\u00A0]+   /* ignorar invisibles y nbsp */
"/*"[\s\S]*?"*/"                /* ignorar comentarios de bloque */

//* Palabras reservadas

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

//* Valores reservados

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

//* Literales

"#"[0-9a-fA-F]{3}([0-9a-fA-F]{3})?      return 'COLOR_HEX';
[0-9]+("."[0-9]+)?"%"                   return 'PORCENTAJE';
[0-9]+"."[0-9]+                         return 'DECIMAL';
[0-9]+                                 return 'ENTERO';
"$"[a-zA-Z][a-zA-Z0-9]*                 return 'VARIABLE';
[a-zA-Z][a-zA-Z0-9]*               return 'IDENTIFICADOR';

//* Simbolos

"{"                   return 'LLAVE_ABRE';
"}"                   return 'LLAVE_CIERRA';
"-"                   return 'GUION';
";"                   return 'PUNTO_COMA';
"="                   return 'ASIGNAR';
"@"                   return 'DECORADOR';
"*"                   return 'MULTIPLICADOR';
"/"                   return 'SLASH';
"+"                   return 'SUMA';
"("                   return 'PAREN_ABRE';
")"                   return 'PAREN_CIERRA';
","                   return 'COMA';

<<EOF>>               return 'EOF';

. {
  const linea = yylloc?.first_line || (yylineno);
  const columna = (yylloc?.first_column ?? 0);
  resgistrarErrorLexico(yytext, linea, columna);
}

/lex

/*
* Analizador Sintactico
*/

%start estilos

%%
estilos
  : /* vacío */
    { $$ = []; }
  | estilos sentencia
    { $$ = $1.concat([$2]); }
  | estilos error PUNTO_COMA {
      registrarErrorSintacticoActual('Sentencia de estilos invalida');
      yyerrok;
      $$ = $1;
    }
  ;

sentencia
  : estilo
    { $$ = $1; }
  | ciclo
    { $$ = $1; }
  ;

estilo
  : selector LLAVE_ABRE lista_propiedades LLAVE_CIERRA
    { $$ = { tipo: 'estilo', selector: $1, extiende: null, propiedades: $3 }; }
  | selector EXTIENDE selector LLAVE_ABRE lista_propiedades LLAVE_CIERRA
    { $$ = { tipo: 'estilo', selector: $1, extiende: $3, propiedades: $5 }; }
  | selector error LLAVE_CIERRA {
      registrarErrorSintacticoActual('Estilo mal formado');
      yyerrok;
      $$ = { tipo: 'estilo', selector: $1, extiende: null, propiedades: [] };
    }
  ;

ciclo
  : PARA variable DESDE expr_rango HASTA expr_rango LLAVE_ABRE lista_estilos_for LLAVE_CIERRA
    { $$ = { tipo: 'for', variable: $2, desde: $4, hasta: $6, inclusivo: true, estilos: $8 }; }
  | PARA variable DESDE expr_rango HASTA_EXCLUYE expr_rango LLAVE_ABRE lista_estilos_for LLAVE_CIERRA
    { $$ = { tipo: 'for', variable: $2, desde: $4, hasta: $6, inclusivo: false, estilos: $8 }; }
  | PARA error LLAVE_CIERRA {
      registrarErrorSintacticoActual('Ciclo for de estilos invalido');
      yyerrok;
      $$ = null;
    }
  ;

lista_estilos_for
  : estilo_for
    { $$ = [$1]; }
  | lista_estilos_for estilo_for
    { $$ = $1.concat([$2]); }
  ;

estilo_for
  : selector_for LLAVE_ABRE lista_propiedades_for LLAVE_CIERRA
    { $$ = { tipo: 'estilo', selector: $1, extiende: null, propiedades: $3 }; }
  | selector_for EXTIENDE selector_for LLAVE_ABRE lista_propiedades_for LLAVE_CIERRA
    { $$ = { tipo: 'estilo', selector: $1, extiende: $3, propiedades: $5 }; }
  ;

selector
  : IDENTIFICADOR
    { $$ = $1; }
  | selector GUION IDENTIFICADOR
    { $$ = `${$1}-${$3}`; }
  ;

selector_for
  : segmento_selector_for
    { $$ = $1; }
  | selector_for GUION segmento_selector_for
    { $$ = `${$1}-${$3}`; }
  ;

segmento_selector_for
  : IDENTIFICADOR
    { $$ = $1; }
  | variable
    { $$ = $1; }
  ;

variable
  : VARIABLE
    { $$ = $1; }
  ;

lista_propiedades
  : propiedad PUNTO_COMA
    { $$ = [$1]; }
  | propiedad PUNTO_COMA lista_propiedades
    { $$ = [$1].concat($3); }
  | propiedad
    { $$ = [$1]; }
  | lista_propiedades error PUNTO_COMA {
      registrarErrorSintacticoActual('Propiedad de estilo invalida');
      yyerrok;
      $$ = $1;
    }
  ;

lista_propiedades_for
  : propiedad_for PUNTO_COMA
    { $$ = [$1]; }
  | propiedad_for PUNTO_COMA lista_propiedades_for
    { $$ = [$1].concat($3); }
  | propiedad_for
    { $$ = [$1]; }
  | lista_propiedades_for error PUNTO_COMA {
      registrarErrorSintacticoActual('Propiedad de estilo en for invalida');
      yyerrok;
      $$ = $1;
    }
  ;

propiedad_for
  : ALTO ASIGNAR medida_for
    { $$ = { propiedad: 'height', valor: $3 }; }
  | ANCHO ASIGNAR medida_for
    { $$ = { propiedad: 'width', valor: $3 }; }
  | MINIMO GUION ANCHO ASIGNAR medida_for
    { $$ = { propiedad: 'min-width', valor: $5 }; }
  | MAXIMO GUION ANCHO ASIGNAR medida_for
    { $$ = { propiedad: 'max-width', valor: $5 }; }
  | MINIMO GUION ALTO ASIGNAR medida_for
    { $$ = { propiedad: 'min-height', valor: $5 }; }
  | MAXIMO GUION ALTO ASIGNAR medida_for
    { $$ = { propiedad: 'max-height', valor: $5 }; }

  | FONDO COLOR ASIGNAR color_valor
    { $$ = { propiedad: 'background-color', valor: $4 }; }
  | COLOR ASIGNAR color_valor
    { $$ = { propiedad: 'color', valor: $3 }; }

  | TEXTO ALINEACION ASIGNAR alineacion_valor
    { $$ = { propiedad: 'text-align', valor: $4 }; }
  | TEXTO SIZE ASIGNAR expr_numerica_for
    { $$ = { propiedad: 'text-size', valor: $4 }; }
  | TEXTO FUENTE ASIGNAR fuente_valor
    { $$ = { propiedad: 'text-font', valor: $4 }; }

  | PADDING ASIGNAR medida_for
    { $$ = { propiedad: 'padding', valor: $3 }; }
  | PADDING LEFT ASIGNAR medida_for
    { $$ = { propiedad: 'padding-left', valor: $4 }; }
  | PADDING RIGHT ASIGNAR medida_for
    { $$ = { propiedad: 'padding-right', valor: $4 }; }
  | PADDING TOP ASIGNAR medida_for
    { $$ = { propiedad: 'padding-top', valor: $4 }; }
  | PADDING BOTTOM ASIGNAR medida_for
    { $$ = { propiedad: 'padding-bottom', valor: $4 }; }

  | MARGIN ASIGNAR medida_for
    { $$ = { propiedad: 'margin', valor: $3 }; }
  | MARGIN LEFT ASIGNAR medida_for
    { $$ = { propiedad: 'margin-left', valor: $4 }; }
  | MARGIN RIGHT ASIGNAR medida_for
    { $$ = { propiedad: 'margin-right', valor: $4 }; }
  | MARGIN TOP ASIGNAR medida_for
    { $$ = { propiedad: 'margin-top', valor: $4 }; }
  | MARGIN BOTTOM ASIGNAR medida_for
    { $$ = { propiedad: 'margin-bottom', valor: $4 }; }

  | BORDE RADIO ASIGNAR expr_numerica_for
    { $$ = { propiedad: 'border-radius', valor: $4 }; }
  | BORDE STYLE ASIGNAR estilo_borde
    { $$ = { propiedad: 'border-style', valor: $4 }; }
  | BORDE ANCHO ASIGNAR expr_numerica_for
    { $$ = { propiedad: 'border-width', valor: $4 }; }
  | BORDE COLOR ASIGNAR color_valor
    { $$ = { propiedad: 'border-color', valor: $4 }; }

  | BORDE ASIGNAR borde_shorthand_for
    { $$ = { propiedad: 'border', valor: $3 }; }
  | BORDE LEFT ASIGNAR borde_shorthand_for
    { $$ = { propiedad: 'border-left', valor: $4 }; }
  | BORDE RIGHT ASIGNAR borde_shorthand_for
    { $$ = { propiedad: 'border-right', valor: $4 }; }
  | BORDE TOP ASIGNAR borde_shorthand_for
    { $$ = { propiedad: 'border-top', valor: $4 }; }
  | BORDE BOTTOM ASIGNAR borde_shorthand_for
    { $$ = { propiedad: 'border-bottom', valor: $4 }; }

  | BORDE LEFT STYLE ASIGNAR estilo_borde
    { $$ = { propiedad: 'border-left-style', valor: $5 }; }
  | BORDE RIGHT STYLE ASIGNAR estilo_borde
    { $$ = { propiedad: 'border-right-style', valor: $5 }; }
  | BORDE TOP STYLE ASIGNAR estilo_borde
    { $$ = { propiedad: 'border-top-style', valor: $5 }; }
  | BORDE BOTTOM STYLE ASIGNAR estilo_borde
    { $$ = { propiedad: 'border-bottom-style', valor: $5 }; }

  | BORDE LEFT ANCHO ASIGNAR expr_numerica_for
    { $$ = { propiedad: 'border-left-width', valor: $5 }; }
  | BORDE RIGHT ANCHO ASIGNAR expr_numerica_for
    { $$ = { propiedad: 'border-right-width', valor: $5 }; }
  | BORDE TOP ANCHO ASIGNAR expr_numerica_for
    { $$ = { propiedad: 'border-top-width', valor: $5 }; }
  | BORDE BOTTOM ANCHO ASIGNAR expr_numerica_for
    { $$ = { propiedad: 'border-bottom-width', valor: $5 }; }

  | BORDE LEFT COLOR ASIGNAR color_valor
    { $$ = { propiedad: 'border-left-color', valor: $5 }; }
  | BORDE RIGHT COLOR ASIGNAR color_valor
    { $$ = { propiedad: 'border-right-color', valor: $5 }; }
  | BORDE TOP COLOR ASIGNAR color_valor
    { $$ = { propiedad: 'border-top-color', valor: $5 }; }
  | BORDE BOTTOM COLOR ASIGNAR color_valor
    { $$ = { propiedad: 'border-bottom-color', valor: $5 }; }
  ;

propiedad
  : ALTO ASIGNAR medida
    { $$ = { propiedad: 'height', valor: $3 }; }
  | ANCHO ASIGNAR medida
    { $$ = { propiedad: 'width', valor: $3 }; }
  | MINIMO GUION ANCHO ASIGNAR medida
    { $$ = { propiedad: 'min-width', valor: $5 }; }
  | MAXIMO GUION ANCHO ASIGNAR medida
    { $$ = { propiedad: 'max-width', valor: $5 }; }
  | MINIMO GUION ALTO ASIGNAR medida
    { $$ = { propiedad: 'min-height', valor: $5 }; }
  | MAXIMO GUION ALTO ASIGNAR medida
    { $$ = { propiedad: 'max-height', valor: $5 }; }

  | FONDO COLOR ASIGNAR color_valor
    { $$ = { propiedad: 'background-color', valor: $4 }; }
  | COLOR ASIGNAR color_valor
    { $$ = { propiedad: 'color', valor: $3 }; }

  | TEXTO ALINEACION ASIGNAR alineacion_valor
    { $$ = { propiedad: 'text-align', valor: $4 }; }
  | TEXTO SIZE ASIGNAR numero
    { $$ = { propiedad: 'text-size', valor: $4 }; }
  | TEXTO FUENTE ASIGNAR fuente_valor
    { $$ = { propiedad: 'text-font', valor: $4 }; }

  | PADDING ASIGNAR medida
    { $$ = { propiedad: 'padding', valor: $3 }; }
  | PADDING LEFT ASIGNAR medida
    { $$ = { propiedad: 'padding-left', valor: $4 }; }
  | PADDING RIGHT ASIGNAR medida
    { $$ = { propiedad: 'padding-right', valor: $4 }; }
  | PADDING TOP ASIGNAR medida
    { $$ = { propiedad: 'padding-top', valor: $4 }; }
  | PADDING BOTTOM ASIGNAR medida
    { $$ = { propiedad: 'padding-bottom', valor: $4 }; }

  | MARGIN ASIGNAR medida
    { $$ = { propiedad: 'margin', valor: $3 }; }
  | MARGIN LEFT ASIGNAR medida
    { $$ = { propiedad: 'margin-left', valor: $4 }; }
  | MARGIN RIGHT ASIGNAR medida
    { $$ = { propiedad: 'margin-right', valor: $4 }; }
  | MARGIN TOP ASIGNAR medida
    { $$ = { propiedad: 'margin-top', valor: $4 }; }
  | MARGIN BOTTOM ASIGNAR medida
    { $$ = { propiedad: 'margin-bottom', valor: $4 }; }

  | BORDE RADIO ASIGNAR numero
    { $$ = { propiedad: 'border-radius', valor: $4 }; }
  | BORDE STYLE ASIGNAR estilo_borde
    { $$ = { propiedad: 'border-style', valor: $4 }; }
  | BORDE ANCHO ASIGNAR numero
    { $$ = { propiedad: 'border-width', valor: $4 }; }
  | BORDE COLOR ASIGNAR color_valor
    { $$ = { propiedad: 'border-color', valor: $4 }; }

  | BORDE ASIGNAR borde_shorthand
    { $$ = { propiedad: 'border', valor: $3 }; }
  | BORDE LEFT ASIGNAR borde_shorthand
    { $$ = { propiedad: 'border-left', valor: $4 }; }
  | BORDE RIGHT ASIGNAR borde_shorthand
    { $$ = { propiedad: 'border-right', valor: $4 }; }
  | BORDE TOP ASIGNAR borde_shorthand
    { $$ = { propiedad: 'border-top', valor: $4 }; }
  | BORDE BOTTOM ASIGNAR borde_shorthand
    { $$ = { propiedad: 'border-bottom', valor: $4 }; }

  | BORDE LEFT STYLE ASIGNAR estilo_borde
    { $$ = { propiedad: 'border-left-style', valor: $5 }; }
  | BORDE RIGHT STYLE ASIGNAR estilo_borde
    { $$ = { propiedad: 'border-right-style', valor: $5 }; }
  | BORDE TOP STYLE ASIGNAR estilo_borde
    { $$ = { propiedad: 'border-top-style', valor: $5 }; }
  | BORDE BOTTOM STYLE ASIGNAR estilo_borde
    { $$ = { propiedad: 'border-bottom-style', valor: $5 }; }

  | BORDE LEFT ANCHO ASIGNAR numero
    { $$ = { propiedad: 'border-left-width', valor: $5 }; }
  | BORDE RIGHT ANCHO ASIGNAR numero
    { $$ = { propiedad: 'border-right-width', valor: $5 }; }
  | BORDE TOP ANCHO ASIGNAR numero
    { $$ = { propiedad: 'border-top-width', valor: $5 }; }
  | BORDE BOTTOM ANCHO ASIGNAR numero
    { $$ = { propiedad: 'border-bottom-width', valor: $5 }; }

  | BORDE LEFT COLOR ASIGNAR color_valor
    { $$ = { propiedad: 'border-left-color', valor: $5 }; }
  | BORDE RIGHT COLOR ASIGNAR color_valor
    { $$ = { propiedad: 'border-right-color', valor: $5 }; }
  | BORDE TOP COLOR ASIGNAR color_valor
    { $$ = { propiedad: 'border-top-color', valor: $5 }; }
  | BORDE BOTTOM COLOR ASIGNAR color_valor
    { $$ = { propiedad: 'border-bottom-color', valor: $5 }; }
  ;

medida
  : PORCENTAJE
    { $$ = { tipo: 'porcentaje', valor: Number(String($1).replace('%', '')) }; }
  | numero
    { $$ = $1; }
  ;

numero
  : DECIMAL
    { $$ = Number($1); }
  | ENTERO
    { $$ = Number($1); }
  ;

color_valor
  : COLOR_HEX
    { $$ = { tipo: 'hex', valor: $1 }; }
  | COLOR_BLUE
    { $$ = $1; }
  | COLOR_WHITE
    { $$ = $1; }
  | COLOR_RED
    { $$ = $1; }
  | COLOR_GREEN
    { $$ = $1; }
  | COLOR_VIOLET
    { $$ = $1; }
  | COLOR_GRAY  
    { $$ = $1; }
  | COLOR_BLACK
    { $$ = $1; }
  | COLOR_LIGHTGRAY
    { $$ = $1; }
  | RGB PAREN_ABRE numero COMA numero COMA numero PAREN_CIERRA
    { $$ = { tipo: 'rgb', valor: [$3, $5, $7] }; }
  ;

alineacion_valor
  : CENTER
    { $$ = $1; }
  | RIGHT_VALUE
    { $$ = $1; }
  | LEFT_VALUE
    { $$ = $1; }
  ;

fuente_valor
  : HELVETICA
    { $$ = $1; }
  | SANS
    { $$ = $1; }
  | SANS SERIF
    { $$ = 'SANS SERIF'; }
  | MONO
    { $$ = $1; }
  | CURSIVE
    { $$ = $1; }
  ;

estilo_borde
  : DOTTED
    { $$ = $1; }
  | LINE
    { $$ = $1; }
  | DOUBLE
    { $$ = $1; }
  | SOLID
    { $$ = $1; }
  ;

borde_shorthand
  : numero estilo_borde color_valor
    { $$ = { ancho: $1, estilo: $2, color: $3 }; }
  ;

borde_shorthand_for
  : expr_numerica_for estilo_borde color_valor
    { $$ = { ancho: $1, estilo: $2, color: $3 }; }
  ;

expr_rango
  : termino_rango
    { $$ = $1; }
  | expr_rango SUMA termino_rango
    { $$ = { op: '+', left: $1, right: $3 }; }
  | expr_rango GUION termino_rango
    { $$ = { op: '-', left: $1, right: $3 }; }
  ;

termino_rango
  : factor_rango
    { $$ = $1; }
  | termino_rango MULTIPLICADOR factor_rango
    { $$ = { op: '*', left: $1, right: $3 }; }
  | termino_rango SLASH factor_rango
    { $$ = { op: '/', left: $1, right: $3 }; }
  ;

factor_rango
  : ENTERO
    { $$ = Number($1); }
  | variable
    { $$ = $1; }
  | PAREN_ABRE expr_rango PAREN_CIERRA
    { $$ = $2; }
  ;

medida_for
  : PORCENTAJE
    { $$ = { tipo: 'porcentaje', valor: Number(String($1).replace('%', '')) }; }
  | expr_numerica_for
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
  ;

factor_numerico_for
  : numero
    { $$ = $1; }
  | variable
    { $$ = $1; }
  | PAREN_ABRE expr_numerica_for PAREN_CIERRA
    { $$ = $2; }
  ;





