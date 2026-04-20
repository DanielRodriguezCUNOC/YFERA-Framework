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
    { $$ = []; }
  | programa componente
    { $$ = $1.concat([$2]); }
  | programa error LLAVE_CIERRA {
      registrarErrorSintacticoActual('Componente invalido');
      yyerrok;
      $$ = $1;
    }
  ;

componente
  : COMPONENTE PARENTESIS_ABRE PARENTESIS_CIERRA LLAVE_ABRE lista_elementos LLAVE_CIERRA
    { $$ = { tipo: 'componente', parametros: [], elementos: $5 }; }
  | COMPONENTE PARENTESIS_ABRE lista_parametros PARENTESIS_CIERRA LLAVE_ABRE lista_elementos LLAVE_CIERRA
    { $$ = { tipo: 'componente', parametros: $3, elementos: $6 }; }
  | COMPONENTE error LLAVE_CIERRA {
      registrarErrorSintacticoActual('Declaracion de componente invalida');
      yyerrok;
      $$ = { tipo: 'componente', parametros: [], elementos: [] };
    }
  ;

lista_parametros
  : parametro
    { $$ = [$1]; }
  | lista_parametros COMA parametro
    { $$ = $1.concat([$3]); }
  ;

parametro
  : tipo IDENTIFICADOR
    { $$ = { tipo: $1, id: $2 }; }
  ;

tipo
  : TIPO_ENTERO
    { $$ = 'int'; }
  | TIPO_FLOTANTE
    { $$ = 'float'; }
  | TIPO_CADENA
    { $$ = 'string'; }
  | TIPO_BOOLEANO
    { $$ = 'boolean'; }
  | TIPO_CARACTER
    { $$ = 'char'; }
  | FUNCION
    { $$ = 'function'; }
  ;

lista_elementos
  : /* vacío */
    { $$ = []; }
  | lista_elementos elemento
    { $$ = $1.concat([$2]); }
  | lista_elementos error {
      registrarErrorSintacticoActual('Elemento de componente invalido');
      yyerrok;
      $$ = $1;
    }
  ;

elemento
  : seccion
    { $$ = $1; }
  | tabla
    { $$ = $1; }
  | texto
    { $$ = $1; }
  | imagen
    { $$ = $1; }
  | formulario
    { $$ = $1; }
  | logica
    { $$ = $1; }
  ;

seccion
  : CORCHETE_ABRE lista_elementos CORCHETE_CIERRA
    { $$ = { tipo: 'seccion', estilos: [], elementos: $2 }; }
  | MENOR lista_estilos MAYOR CORCHETE_ABRE lista_elementos CORCHETE_CIERRA
    { $$ = { tipo: 'seccion', estilos: $2, elementos: $5 }; }
  | MENOR error CORCHETE_CIERRA {
      registrarErrorSintacticoActual('Seccion invalida');
      yyerrok;
      $$ = { tipo: 'seccion', estilos: [], elementos: [] };
    }
  ;

lista_estilos
  : IDENTIFICADOR
    { $$ = [$1]; }
  | lista_estilos COMA IDENTIFICADOR
    { $$ = $1.concat([$3]); }
  ;

tabla
  : TABLA_ABRE tabla_contenido TABLA_CIERRA
    { $$ = { tipo: 'tabla', estilos: [], filas: $2 }; }
  | MENOR lista_estilos MAYOR TABLA_ABRE tabla_contenido TABLA_CIERRA
    { $$ = { tipo: 'tabla', estilos: $2, filas: $5 }; }
  | TABLA_ABRE error TABLA_CIERRA {
      registrarErrorSintacticoActual('Tabla invalida');
      yyerrok;
      $$ = { tipo: 'tabla', estilos: [], filas: [] };
    }
  ;

tabla_contenido
  : /* vacío */
    { $$ = []; }
  | tabla_contenido fila_tabla
    { $$ = $1.concat([$2]); }
  ;

fila_tabla
  : TABLA_ABRE celda_tabla TABLA_CIERRA
    { $$ = { tipo: 'fila', celdas: $2 }; }
  ;

celda_tabla
  : /* vacío */
    { $$ = []; }
  | celda_tabla TABLA_ABRE lista_elementos TABLA_CIERRA
    { $$ = $1.concat([{ tipo: 'celda', elementos: $3 }]); }
  ;

texto
  : TEXTO PARENTESIS_ABRE CADENA PARENTESIS_CIERRA
    { $$ = { tipo: 'texto', estilos: [], contenido: $3 }; }
  | TEXTO MENOR lista_estilos MAYOR PARENTESIS_ABRE CADENA PARENTESIS_CIERRA
    { $$ = { tipo: 'texto', estilos: $3, contenido: $6 }; }
  | TEXTO error PARENTESIS_CIERRA {
      registrarErrorSintacticoActual('Texto invalido');
      yyerrok;
      $$ = { tipo: 'texto', estilos: [], contenido: '' };
    }
  ;

imagen
  : IMAGEN PARENTESIS_ABRE lista_fuentes_imagen PARENTESIS_CIERRA
    { $$ = { tipo: 'imagen', estilos: [], fuentes: $3 }; }
  | IMAGEN MENOR lista_estilos MAYOR PARENTESIS_ABRE lista_fuentes_imagen PARENTESIS_CIERRA
    { $$ = { tipo: 'imagen', estilos: $3, fuentes: $6 }; }
  | IMAGEN error PARENTESIS_CIERRA {
      registrarErrorSintacticoActual('Imagen invalida');
      yyerrok;
      $$ = { tipo: 'imagen', estilos: [], fuentes: [] };
    }
  ;

lista_fuentes_imagen
  : fuente_imagen
    { $$ = [$1]; }
  | lista_fuentes_imagen COMA fuente_imagen
    { $$ = $1.concat([$3]); }
  ;

fuente_imagen
  : CADENA
    { $$ = { tipo: 'cadena', valor: $1 }; }
  | VARIABLE
    { $$ = { tipo: 'variable', valor: $1 }; }
  | VARIABLE CORCHETE_ABRE NUMERO CORCHETE_CIERRA
    { $$ = { tipo: 'acceso_arreglo', variable: $1, indice: Number($3) }; }
  ;

formulario
  : FORMULARIO LLAVE_ABRE lista_inputs LLAVE_CIERRA submit_opcional
    { $$ = { tipo: 'formulario', estilos: [], elementos: $3, submit: $5 }; }
  | FORMULARIO MENOR lista_estilos MAYOR LLAVE_ABRE lista_inputs LLAVE_CIERRA submit_opcional
    { $$ = { tipo: 'formulario', estilos: $3, elementos: $6, submit: $8 }; }
  | FORMULARIO error LLAVE_CIERRA {
      registrarErrorSintacticoActual('Formulario invalido');
      yyerrok;
      $$ = { tipo: 'formulario', estilos: [], elementos: [], submit: null };
    }
  ;

submit_opcional
  : /* vacío */
    { $$ = null; }
  | ENVIAR bloc_submit
    { $$ = $2; }
  ;

lista_inputs
  : /* vacío */
    { $$ = []; }
  | lista_inputs input_elemento
    { $$ = $1.concat([$2]); }
  | lista_inputs error {
      registrarErrorSintacticoActual('Input invalido dentro de formulario');
      yyerrok;
      $$ = $1;
    }
  ;

input_elemento
  : INPUT_TEXTO lista_propiedades_input
    { $$ = { tipo: 'input_text', config: $2 }; }
  | INPUT_NUMERO lista_propiedades_input
    { $$ = { tipo: 'input_number', config: $2 }; }
  | INPUT_BOOLEANO lista_propiedades_input
    { $$ = { tipo: 'input_bool', config: $2 }; }
  ;

lista_propiedades_input
  : MENOR lista_estilos MAYOR PARENTESIS_ABRE lista_entrada PARENTESIS_CIERRA
    { $$ = { estilos: $2, propiedades: $5 }; }
  | PARENTESIS_ABRE lista_entrada PARENTESIS_CIERRA
    { $$ = { estilos: [], propiedades: $2 }; }
  ;

lista_entrada
  : entrada
    { $$ = [$1]; }
  | lista_entrada COMA entrada
    { $$ = $1.concat([$3]); }
  ;

entrada
  : ID_FORMULARIO DOS_PUNTOS CADENA
    { $$ = { propiedad: 'id', valor: $3 }; }
  | ETIQUETA_FORMULARIO DOS_PUNTOS CADENA
    { $$ = { propiedad: 'label', valor: $3 }; }
  | VALOR_FORMULARIO DOS_PUNTOS valor_entrada
    { $$ = { propiedad: 'value', valor: $3 }; }
  ;

valor_entrada
  : NUMERO
    { $$ = Number($1); }
  | CADENA
    { $$ = $1; }
  | VERDADERO
    { $$ = true; }
  | FALSO
    { $$ = false; }
  | VARIABLE
    { $$ = { tipo: 'variable', valor: $1 }; }
  ;

bloc_submit
  : MENOR lista_estilos MAYOR LLAVE_ABRE lista_propiedades_submit LLAVE_CIERRA
    { $$ = { tipo: 'submit', estilos: $2, propiedades: $5 }; }
  | LLAVE_ABRE lista_propiedades_submit LLAVE_CIERRA
    { $$ = { tipo: 'submit', estilos: [], propiedades: $2 }; }
  ;

lista_propiedades_submit
  : propiedad_submit
    { $$ = [$1]; }
  | lista_propiedades_submit propiedad_submit
    { $$ = $1.concat([$2]); }
  ;

propiedad_submit
  : ETIQUETA_FORMULARIO DOS_PUNTOS CADENA
    { $$ = { propiedad: 'label', valor: $3 }; }
  | FUNCION DOS_PUNTOS VARIABLE PARENTESIS_ABRE lista_argumentos PARENTESIS_CIERRA
    { $$ = { propiedad: 'function', funcion: $3, argumentos: $5 }; }
  ;

lista_argumentos
  : argumento
    { $$ = [$1]; }
  | lista_argumentos COMA argumento
    { $$ = $1.concat([$3]); }
  ;

argumento
  : VARIABLE
    { $$ = { tipo: 'variable', valor: $1 }; }
  | REFERENCIA_CAMPO
    { $$ = { tipo: 'referencia_form', valor: $1 }; }
  ;

logica
  : ciclo_for
    { $$ = $1; }
  | ciclo_for_each
    { $$ = $1; }
  | condicional
    { $$ = $1; }
  | switch_stmt
    { $$ = $1; }
  | error LLAVE_CIERRA {
      registrarErrorSintacticoActual('Bloque logico invalido');
      yyerrok;
      $$ = null;
    }
  ;

ciclo_for
  : PARA CADA PARENTESIS_ABRE VARIABLE DOS_PUNTOS VARIABLE PARENTESIS_CIERRA LLAVE_ABRE lista_elementos LLAVE_CIERRA
    { $$ = { tipo: 'for_each_simple', origen: $4, item: $6, cuerpo: $9, vacio: null }; }
  | PARA CADA PARENTESIS_ABRE VARIABLE DOS_PUNTOS VARIABLE PARENTESIS_CIERRA LLAVE_ABRE lista_elementos LLAVE_CIERRA VACIO LLAVE_ABRE lista_elementos LLAVE_CIERRA
    { $$ = { tipo: 'for_each_simple', origen: $4, item: $6, cuerpo: $9, vacio: $13 }; }
  ;

ciclo_for_each
  : PARA PARENTESIS_ABRE lista_for_vars PARENTESIS_CIERRA SEGUIMIENTO VARIABLE LLAVE_ABRE lista_elementos LLAVE_CIERRA
    { $$ = { tipo: 'for_each_track', pares: $3, indice: $6, cuerpo: $8, vacio: null }; }
  | PARA PARENTESIS_ABRE lista_for_vars PARENTESIS_CIERRA SEGUIMIENTO VARIABLE LLAVE_ABRE lista_elementos LLAVE_CIERRA VACIO LLAVE_ABRE lista_elementos LLAVE_CIERRA
    { $$ = { tipo: 'for_each_track', pares: $3, indice: $6, cuerpo: $8, vacio: $12 }; }
  ;

lista_for_vars
  : for_var
    { $$ = [$1]; }
  | lista_for_vars COMA for_var
    { $$ = $1.concat([$3]); }
  ;

for_var
  : VARIABLE DOS_PUNTOS VARIABLE
    { $$ = { origen: $1, actual: $3 }; }
  ;

condicional
  : SI PARENTESIS_ABRE expresion PARENTESIS_CIERRA LLAVE_ABRE lista_elementos LLAVE_CIERRA
    { $$ = { tipo: 'if', condicion: $3, cuerpo: $6, elseIfs: [], else: null }; }
  | SI PARENTESIS_ABRE expresion PARENTESIS_CIERRA LLAVE_ABRE lista_elementos LLAVE_CIERRA lista_else
    {
      const partesElseIf = $8.filter((x) => x.tipo === 'else_if');
      const parteElse = $8.find((x) => x.tipo === 'else') || null;
      $$ = { tipo: 'if', condicion: $3, cuerpo: $6, elseIfs: partesElseIf, else: parteElse };
    }
  ;

lista_else
  : else_parte
    { $$ = [$1]; }
  | lista_else else_parte
    { $$ = $1.concat([$2]); }
  ;

else_parte
  : SINO PARENTESIS_ABRE expresion PARENTESIS_CIERRA LLAVE_ABRE lista_elementos LLAVE_CIERRA
    { $$ = { tipo: 'else_if', condicion: $3, cuerpo: $6 }; }
  | SINO LLAVE_ABRE lista_elementos LLAVE_CIERRA
    { $$ = { tipo: 'else', cuerpo: $3 }; }
  ;

switch_stmt
  : SWITCH PARENTESIS_ABRE VARIABLE PARENTESIS_CIERRA LLAVE_ABRE lista_casos LLAVE_CIERRA
    { $$ = { tipo: 'switch', variable: $3, casos: $6, defecto: null }; }
  | SWITCH PARENTESIS_ABRE VARIABLE PARENTESIS_CIERRA LLAVE_ABRE lista_casos caso_defecto LLAVE_CIERRA
    { $$ = { tipo: 'switch', variable: $3, casos: $6, defecto: $7 }; }
  ;

lista_casos
  : caso
    { $$ = [$1]; }
  | lista_casos COMA caso
    { $$ = $1.concat([$3]); }
  ;

caso
  : CASO CADENA LLAVE_ABRE lista_elementos LLAVE_CIERRA
    { $$ = { valor: $2, cuerpo: $4 }; }
  ;

caso_defecto
  : DEFECTO LLAVE_ABRE lista_elementos LLAVE_CIERRA
    { $$ = { cuerpo: $3 }; }
  ;

expresion
  : comparacion
    { $$ = $1; }
  | expresion AND comparacion
    { $$ = { op: '&&', left: $1, right: $3 }; }
  | expresion OR comparacion
    { $$ = { op: '||', left: $1, right: $3 }; }
  ;

comparacion
  : termino
    { $$ = $1; }
  | termino IGUALDAD termino
    { $$ = { op: '==', left: $1, right: $3 }; }
  | termino NO_IGUAL termino
    { $$ = { op: '!=', left: $1, right: $3 }; }
  | termino MENOR termino
    { $$ = { op: '<', left: $1, right: $3 }; }
  | termino MAYOR termino
    { $$ = { op: '>', left: $1, right: $3 }; }
  ;

termino
  : factor
    { $$ = $1; }
  | termino SUMA factor
    { $$ = { op: '+', left: $1, right: $3 }; }
  | termino GUION factor
    { $$ = { op: '-', left: $1, right: $3 }; }
  | termino MULTIPLICADOR factor
    { $$ = { op: '*', left: $1, right: $3 }; }
  | termino DIVISION factor
    { $$ = { op: '/', left: $1, right: $3 }; }
  ;

factor
  : NUMERO
    { $$ = Number($1); }
  | CADENA
    { $$ = $1; }
  | VARIABLE
    { $$ = { tipo: 'variable', valor: $1 }; }
  | VERDADERO
    { $$ = true; }
  | FALSO
    { $$ = false; }
  | PARENTESIS_ABRE expresion PARENTESIS_CIERRA
    { $$ = $2; }
  | VARIABLE CORCHETE_ABRE NUMERO CORCHETE_CIERRA
    { $$ = { tipo: 'acceso_arreglo', variable: $1, indice: Number($3) }; }
  ;
