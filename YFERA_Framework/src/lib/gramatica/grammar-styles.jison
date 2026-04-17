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
"for"                 return 'PARA';
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
[a-zA-Z_][a-zA-Z0-9_]*               return 'IDENTIFICADOR';

//* Simbolos

"{"                   return 'LLAVE_ABRE';
"}"                   return 'LLAVE_CIERRA';
"-"                   return 'GUION';
";"                   return 'PUNTO_COMA';
"="                   return 'ASIGNAR';
"@"                   return 'DECORADOR';
"$"                   return 'DOLLAR';
"*"                   return 'MULTIPLICADOR';
"/"                   return 'SLASH';
"+"                   return 'SUMA';
"("                   return 'PAREN_ABRE';
")"                   return 'PAREN_CIERRA';
","                   return 'COMA';

<<EOF>>               return 'EOF';

. {
  const linea = yylloc?.first_line || (yylineno + 1);
  const columna = (yylloc?.first_column ?? 0) + 1;
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
  | estilos sentencia
  ;

sentencia
  : estilo
  | ciclo
  ;

estilo
  : selector LLAVE_ABRE lista_propiedades LLAVE_CIERRA
  | selector EXTIENDE selector LLAVE_ABRE lista_propiedades LLAVE_CIERRA
  ;

ciclo
  : DECORADOR PARA variable DESDE expr_rango HASTA expr_rango LLAVE_ABRE lista_estilos_for LLAVE_CIERRA
  | DECORADOR PARA variable DESDE expr_rango HASTA_EXCLUYE expr_rango LLAVE_ABRE lista_estilos_for LLAVE_CIERRA
  ;

lista_estilos_for
  : estilo_for
  | lista_estilos_for estilo_for
  ;

estilo_for
  : selector LLAVE_ABRE lista_propiedades_for LLAVE_CIERRA
  | selector EXTIENDE selector LLAVE_ABRE lista_propiedades_for LLAVE_CIERRA
  ;

selector
  : segmento_selector
  | selector GUION segmento_selector
  ;

segmento_selector
  : IDENTIFICADOR
  | variable
  ;

variable
  : DOLLAR IDENTIFICADOR
  ;

lista_propiedades
  : propiedad PUNTO_COMA
  | propiedad PUNTO_COMA lista_propiedades
  | propiedad
  ;

lista_propiedades_for
  : propiedad PUNTO_COMA
  | propiedad PUNTO_COMA lista_propiedades_for
  | propiedad
  ;

propiedad
  : ALTO ASIGNAR medida
  | ANCHO ASIGNAR medida
  | MINIMO GUION ANCHO ASIGNAR medida
  | MAXIMO GUION ANCHO ASIGNAR medida
  | MINIMO GUION ALTO ASIGNAR medida
  | MAXIMO GUION ALTO ASIGNAR medida

  | FONDO COLOR ASIGNAR color_valor
  | COLOR ASIGNAR color_valor

  | TEXTO ALINEACION ASIGNAR alineacion_valor
  | TEXTO SIZE ASIGNAR numero
  | TEXTO FUENTE ASIGNAR fuente_valor

  | PADDING ASIGNAR medida
  | PADDING LEFT ASIGNAR medida
  | PADDING RIGHT ASIGNAR medida
  | PADDING TOP ASIGNAR medida
  | PADDING BOTTOM ASIGNAR medida

  | MARGIN ASIGNAR medida
  | MARGIN LEFT ASIGNAR medida
  | MARGIN RIGHT ASIGNAR medida
  | MARGIN TOP ASIGNAR medida
  | MARGIN BOTTOM ASIGNAR medida

  | BORDE RADIO ASIGNAR numero
  | BORDE STYLE ASIGNAR estilo_borde
  | BORDE ANCHO ASIGNAR numero
  | BORDE COLOR ASIGNAR color_valor

  | BORDE ASIGNAR borde_shorthand
  | BORDE LEFT ASIGNAR borde_shorthand
  | BORDE RIGHT ASIGNAR borde_shorthand
  | BORDE TOP ASIGNAR borde_shorthand
  | BORDE BOTTOM ASIGNAR borde_shorthand

  | BORDE LEFT STYLE ASIGNAR estilo_borde
  | BORDE RIGHT STYLE ASIGNAR estilo_borde
  | BORDE TOP STYLE ASIGNAR estilo_borde
  | BORDE BOTTOM STYLE ASIGNAR estilo_borde

  | BORDE LEFT ANCHO ASIGNAR numero
  | BORDE RIGHT ANCHO ASIGNAR numero
  | BORDE TOP ANCHO ASIGNAR numero
  | BORDE BOTTOM ANCHO ASIGNAR numero

  | BORDE LEFT COLOR ASIGNAR color_valor
  | BORDE RIGHT COLOR ASIGNAR color_valor
  | BORDE TOP COLOR ASIGNAR color_valor
  | BORDE BOTTOM COLOR ASIGNAR color_valor
  ;

medida
  : PORCENTAJE
  | numero
  ;

numero
  : DECIMAL
  | ENTERO
  ;

color_valor
  : COLOR_HEX
  | COLOR_BLUE
  | COLOR_WHITE
  | COLOR_RED
  | COLOR_GREEN
  | COLOR_VIOLET
  | COLOR_GRAY  
  | COLOR_BLACK
  | COLOR_LIGHTGRAY
  | RGB PAREN_ABRE numero COMA numero COMA numero PAREN_CIERRA
  ;

alineacion_valor
  : CENTER
  | RIGHT_VALUE
  | LEFT_VALUE
  ;

fuente_valor
  : HELVETICA
  | SANS
  | SANS SERIF
  | SERIF
  | MONO
  | CURSIVE
  ;

estilo_borde
  : DOTTED
  | LINE
  | DOUBLE
  | SOLID
  ;

borde_shorthand
  : numero estilo_borde color_valor
  ;

expr_rango
  : termino_rango
  | expr_rango SUMA termino_rango
  | expr_rango GUION termino_rango
  ;

termino_rango
  : factor_rango
  | termino_rango MULTIPLICADOR factor_rango
  | termino_rango SLASH factor_rango
  ;

factor_rango
  : numero
  | variable
  | PAREN_ABRE expr_rango PAREN_CIERRA
  ;





