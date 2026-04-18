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

"component"        return 'COMPONENTE';
"int"              return 'TIPO_ENTERO';
"float"            return 'TIPO_FLOTANTE';
"string"           return 'TIPO_CADENA';
"boolean"          return 'TIPO_BOOLEANO';
"char"             return 'TIPO_CARACTER';
"function"         return 'FUNCION';
"T"                return 'TEXTO';
"IMG"              return 'IMAGEN';
"FORM"             return 'FORMULARIO';
"INPUT_TEXT"       return 'INPUT_TEXTO';
"INPUT_NUMBER"     return 'INPUT_NUMERO';
"INPUT_BOOL"       return 'INPUT_BOOLEANO';
"SUBMIT"           return 'ENVIAR';
"id"               return 'ID_FORMULARIO';
"label"            return 'ETIQUETA_FORMULARIO';
"value"            return 'VALOR_FORMULARIO';
"for"              return 'PARA';
"each"             return 'CADA';
"track"            return 'SEGUIMIENTO';
"empty"            return 'VACIO';
"if"               return 'SI';
"else"             return 'SINO';
"while"            return 'MIENTRAS';
"switch"           return 'SWITCH';
"Switch"           return 'SWITCH';
"case"             return 'CASO';
"default"          return 'DEFECTO';
"true"             return 'VERDADERO';
"false"            return 'FALSO';


//* Simbolos
"{"                return 'LLAVE_ABRE';
"}"                return 'LLAVE_CIERRA';
"("                return 'PARENTESIS_ABRE';
")"                return 'PARENTESIS_CIERRA';
"[["               return 'TABLA_ABRE';
"]]"               return 'TABLA_CIERRA';
"["                return 'CORCHETE_ABRE';
"]"                return 'CORCHETE_CIERRA';
"<"                return 'MENOR';
">"                return 'MAYOR';
","                return 'COMA';
"@"[a-zA-Z_][a-zA-Z0-9_]*  return 'REFERENCIA_CAMPO';
"@"                return 'REFERENCIA_ID_FORMULARIO';
":"                return 'DOS_PUNTOS';
"="                return 'ASIGNAR';
"=="               return 'IGUALDAD';
"!="               return 'NO_IGUAL';
"-"                return 'GUION';
"+"                return 'SUMA';
"*"                return 'MULTIPLICADOR';
"/"                return 'DIVISION';
"'"                return 'COMILLA_SIMPLE';
"\""               return 'COMILLA_DOBLE';


//* LITERALES Y VARIABLES
"$"[a-zA-Z_][a-zA-Z0-9_]*          return 'VARIABLE';
\"[^\"]*\"                         return 'CADENA';
\'[^\']*\'                         return 'CARACTER';
[0-9]+("."[0-9]+)?                 return 'NUMERO';
[a-zA-Z_][a-zA-Z0-9_-]*            return 'IDENTIFICADOR';


//* OPERADORES LOGICOS
"&&"               return 'AND';
"||"               return 'OR';

<<EOF>>            return 'EOF';

. {
  const linea = yylloc?.first_line || (yylineno);
  const columna = (yylloc?.first_column ?? 0);
  resgistrarErrorLexico(yytext, linea, columna);
}

/lex

/*
* Analizador Sintactico
*/

%start programa
%%

programa
  : /* vacío */
  | programa componente
  | programa error LLAVE_CIERRA {
      registrarErrorSintacticoActual('Componente invalido');
      yyerrok;
    }
  ;

componente
  : COMPONENTE PARENTESIS_ABRE PARENTESIS_CIERRA LLAVE_ABRE lista_elementos LLAVE_CIERRA
  | COMPONENTE PARENTESIS_ABRE lista_parametros PARENTESIS_CIERRA LLAVE_ABRE lista_elementos LLAVE_CIERRA
  ;

lista_parametros
  : parametro
  | lista_parametros COMA parametro
  ;

parametro
  : tipo IDENTIFICADOR
  ;

tipo
  : TIPO_ENTERO
  | TIPO_FLOTANTE
  | TIPO_CADENA
  | TIPO_BOOLEANO
  | TIPO_CARACTER
  | FUNCION
  ;

lista_elementos
  : /* vacío */
  | lista_elementos elemento
  ;

elemento
  : seccion
  | tabla
  | texto
  | imagen
  | formulario
  | logica
  ;

seccion
  : CORCHETE_ABRE lista_elementos CORCHETE_CIERRA
  | MENOR lista_estilos MAYOR CORCHETE_ABRE lista_elementos CORCHETE_CIERRA
  ;

lista_estilos
  : IDENTIFICADOR
  | lista_estilos COMA IDENTIFICADOR
  ;

tabla
  : TABLA_ABRE tabla_contenido TABLA_CIERRA
  | MENOR lista_estilos MAYOR TABLA_ABRE tabla_contenido TABLA_CIERRA
  ;

tabla_contenido
  : /* vacío */
  | tabla_contenido fila_tabla
  ;

fila_tabla
  : TABLA_ABRE celda_tabla TABLA_CIERRA
  ;

celda_tabla
  : /* vacío */
  | celda_tabla TABLA_ABRE lista_elementos TABLA_CIERRA
  ;

texto
  : TEXTO PARENTESIS_ABRE CADENA PARENTESIS_CIERRA
  | TEXTO MENOR lista_estilos MAYOR PARENTESIS_ABRE CADENA PARENTESIS_CIERRA
  ;

imagen
  : IMAGEN PARENTESIS_ABRE lista_fuentes_imagen PARENTESIS_CIERRA
  | IMAGEN MENOR lista_estilos MAYOR PARENTESIS_ABRE lista_fuentes_imagen PARENTESIS_CIERRA
  ;

lista_fuentes_imagen
  : fuente_imagen
  | lista_fuentes_imagen COMA fuente_imagen
  ;

fuente_imagen
  : CADENA
  | VARIABLE
  | VARIABLE CORCHETE_ABRE NUMERO CORCHETE_CIERRA
  ;

formulario
  : FORMULARIO LLAVE_ABRE lista_inputs LLAVE_CIERRA submit_opcional
  | FORMULARIO MENOR lista_estilos MAYOR LLAVE_ABRE lista_inputs LLAVE_CIERRA submit_opcional
  ;

submit_opcional
  : /* vacío */
  | ENVIAR bloc_submit
  ;

lista_inputs
  : /* vacío */
  | lista_inputs input_elemento
  ;

input_elemento
  : INPUT_TEXTO lista_propiedades_input
  | INPUT_NUMERO lista_propiedades_input
  | INPUT_BOOLEANO lista_propiedades_input
  ;

lista_propiedades_input
  : MENOR lista_estilos MAYOR PARENTESIS_ABRE lista_entrada PARENTESIS_CIERRA
  | PARENTESIS_ABRE lista_entrada PARENTESIS_CIERRA
  ;

lista_entrada
  : entrada
  | lista_entrada COMA entrada
  ;

entrada
  : ID_FORMULARIO DOS_PUNTOS CADENA
  | ETIQUETA_FORMULARIO DOS_PUNTOS CADENA
  | VALOR_FORMULARIO DOS_PUNTOS valor_entrada
  ;

valor_entrada
  : NUMERO
  | CADENA
  | VERDADERO
  | FALSO
  | VARIABLE
  ;

bloc_submit
  : MENOR lista_estilos MAYOR LLAVE_ABRE lista_propiedades_submit LLAVE_CIERRA
  | LLAVE_ABRE lista_propiedades_submit LLAVE_CIERRA
  ;

lista_propiedades_submit
  : propiedad_submit
  | lista_propiedades_submit propiedad_submit
  ;

propiedad_submit
  : ETIQUETA_FORMULARIO DOS_PUNTOS CADENA
  | FUNCION DOS_PUNTOS VARIABLE PARENTESIS_ABRE lista_argumentos PARENTESIS_CIERRA
  ;

lista_argumentos
  : argumento
  | lista_argumentos COMA argumento
  ;

argumento
  : VARIABLE
  | REFERENCIA_CAMPO
  ;

logica
  : ciclo_for
  | ciclo_for_each
  | condicional
  | switch_stmt
  ;

ciclo_for
  : PARA CADA PARENTESIS_ABRE VARIABLE DOS_PUNTOS VARIABLE PARENTESIS_CIERRA LLAVE_ABRE lista_elementos LLAVE_CIERRA
  | PARA CADA PARENTESIS_ABRE VARIABLE DOS_PUNTOS VARIABLE PARENTESIS_CIERRA LLAVE_ABRE lista_elementos LLAVE_CIERRA VACIO LLAVE_ABRE lista_elementos LLAVE_CIERRA
  ;

ciclo_for_each
  : PARA PARENTESIS_ABRE lista_for_vars PARENTESIS_CIERRA SEGUIMIENTO VARIABLE LLAVE_ABRE lista_elementos LLAVE_CIERRA
  | PARA PARENTESIS_ABRE lista_for_vars PARENTESIS_CIERRA SEGUIMIENTO VARIABLE LLAVE_ABRE lista_elementos LLAVE_CIERRA VACIO LLAVE_ABRE lista_elementos LLAVE_CIERRA
  ;

lista_for_vars
  : for_var
  | lista_for_vars COMA for_var
  ;

for_var
  : VARIABLE DOS_PUNTOS VARIABLE
  ;

condicional
  : SI PARENTESIS_ABRE expresion PARENTESIS_CIERRA LLAVE_ABRE lista_elementos LLAVE_CIERRA
  | SI PARENTESIS_ABRE expresion PARENTESIS_CIERRA LLAVE_ABRE lista_elementos LLAVE_CIERRA lista_else
  ;

lista_else
  : else_parte
  | lista_else else_parte
  ;

else_parte
  : SINO PARENTESIS_ABRE expresion PARENTESIS_CIERRA LLAVE_ABRE lista_elementos LLAVE_CIERRA
  | SINO LLAVE_ABRE lista_elementos LLAVE_CIERRA
  ;

switch_stmt
  : SWITCH PARENTESIS_ABRE VARIABLE PARENTESIS_CIERRA LLAVE_ABRE lista_casos LLAVE_CIERRA
  | SWITCH PARENTESIS_ABRE VARIABLE PARENTESIS_CIERRA LLAVE_ABRE lista_casos caso_defecto LLAVE_CIERRA
  ;

lista_casos
  : caso
  | lista_casos COMA caso
  ;

caso
  : CASO CADENA LLAVE_ABRE lista_elementos LLAVE_CIERRA
  ;

caso_defecto
  : DEFECTO LLAVE_ABRE lista_elementos LLAVE_CIERRA
  ;

expresion
  : comparacion
  | expresion AND comparacion
  | expresion OR comparacion
  ;

comparacion
  : termino
  | termino IGUALDAD termino
  | termino NO_IGUAL termino
  | termino MENOR termino
  | termino MAYOR termino
  ;

termino
  : factor
  | termino SUMA factor
  | termino GUION factor
  | termino MULTIPLICADOR factor
  | termino DIVISION factor
  ;

factor
  : NUMERO
  | CADENA
  | VARIABLE
  | VERDADERO
  | FALSO
  | PARENTESIS_ABRE expresion PARENTESIS_CIERRA
  | VARIABLE CORCHETE_ABRE NUMERO CORCHETE_CIERRA
  ;
