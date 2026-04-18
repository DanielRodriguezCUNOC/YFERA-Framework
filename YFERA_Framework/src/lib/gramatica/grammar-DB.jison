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

\s+                                 /* ignorar espacios y saltos */
[\u200B\u200C\u200D\uFEFF\u00A0]+ /* ignorar invisibles y nbsp */
"/*"[\s\S]*?"*/"                   /* ignorar comentarios de bloque */

"TABLE"                 return 'TABLA';
"COLUMNS"               return 'COLUMNAS';
"IN"                    return 'EN';
"DELETE"                return 'BORRAR';

"int"                   return 'TIPO_ENTERO';
"float"                 return 'TIPO_FLOTANTE';
"string"                return 'TIPO_CADENA';
"boolean"               return 'TIPO_BOOLEANO';
"char"                  return 'TIPO_CARACTER';

"true"                  return 'VERDADERO';
"false"                 return 'FALSO';

","                     return 'COMA';
"="                     return 'ASIGNACION';
"."                     return 'PUNTO';
";"                     return 'PUNTO_COMA';
"["                     return 'CORCHETE_ABRE';
"]"                     return 'CORCHETE_CIERRA';

\"[^\"]*\"                            return 'CADENA';
\'[^\']\'                             return 'CARACTER';
[0-9]+"."[0-9]+                        return 'DECIMAL';
[0-9]+                                  return 'ENTERO';
[a-zA-Z_][a-zA-Z0-9_]*                  return 'IDENTIFICADOR';

<<EOF>>                 return 'EOF';

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
  : /* vacio */
  | programa sentencia
  ;

sentencia
  : crear_tabla PUNTO_COMA
  | seleccionar_columna PUNTO_COMA
  | insertar_registro
  | actualizar_registro PUNTO_COMA
  | eliminar_registro PUNTO_COMA
  | error PUNTO_COMA {
      registrarErrorSintacticoActual('Sentencia DB invalida');
      yyerrok;
    }
  ;

crear_tabla
  : TABLA IDENTIFICADOR COLUMNAS lista_columnas
  | TABLA error COLUMNAS lista_columnas {
      registrarErrorSintacticoActual('Creacion de tabla invalida');
      yyerrok;
    }
  ;

lista_columnas
  : columna_def
  | lista_columnas COMA columna_def
  ;

columna_def
  : IDENTIFICADOR ASIGNACION tipo_dato
  ;

tipo_dato
  : TIPO_ENTERO
  | TIPO_FLOTANTE
  | TIPO_CADENA
  | TIPO_BOOLEANO
  | TIPO_CARACTER
  ;

seleccionar_columna
  : IDENTIFICADOR PUNTO IDENTIFICADOR
  | IDENTIFICADOR error IDENTIFICADOR {
      registrarErrorSintacticoActual('Consulta de columna invalida');
      yyerrok;
    }
  ;

insertar_registro
  : IDENTIFICADOR CORCHETE_ABRE lista_asignaciones CORCHETE_CIERRA
  | IDENTIFICADOR CORCHETE_ABRE lista_asignaciones CORCHETE_CIERRA PUNTO_COMA
  | IDENTIFICADOR CORCHETE_ABRE error CORCHETE_CIERRA {
      registrarErrorSintacticoActual('Insercion de registro invalida');
      yyerrok;
    }
  ;

actualizar_registro
  : IDENTIFICADOR CORCHETE_ABRE lista_asignaciones CORCHETE_CIERRA EN ENTERO
  | IDENTIFICADOR CORCHETE_ABRE error CORCHETE_CIERRA EN ENTERO {
      registrarErrorSintacticoActual('Actualizacion de registro invalida');
      yyerrok;
    }
  ;

eliminar_registro
  : IDENTIFICADOR BORRAR ENTERO
  | IDENTIFICADOR BORRAR error {
      registrarErrorSintacticoActual('Eliminacion de registro invalida');
      yyerrok;
    }
  ;

lista_asignaciones
  : asignacion
  | lista_asignaciones COMA asignacion
  ;

asignacion
  : IDENTIFICADOR ASIGNACION valor
  ;

valor
  : CADENA
  | CARACTER
  | DECIMAL
  | ENTERO
  | VERDADERO
  | FALSO
  ;
