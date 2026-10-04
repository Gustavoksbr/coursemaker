package com.coursemaker.service;

import com.fasterxml.jackson.databind.JsonNode;

import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The closed set of Java types a function-mode exercise may use for parameters and the return value,
 * and whether a JSON value fits one of them. Mirrors piston-gateway/javaharness.go, which builds the
 * Java literals: scalars (int, long, double, boolean, String), arrays of those (int[]) and lists of
 * their boxed forms (List&lt;Integer&gt;). Checking here gives the creator a precise message instead of a
 * generic "runner unavailable" when the gateway refuses a value.
 */
final class JavaTypes {

    private static final Map<String, String> BOXED_TO_SCALAR = Map.of(
            "Integer", "int", "Long", "long", "Double", "double", "Boolean", "boolean", "String", "String");

    private static final Pattern LIST = Pattern.compile("^List<([A-Za-z]+)>$");

    private JavaTypes() {
    }

    /** The element/scalar kind of a type, or null when the type is not in the set. */
    static String scalarOf(String type) {
        if (type == null) {
            return null;
        }
        if (isScalar(type)) {
            return type;
        }
        if (type.endsWith("[]") && isScalar(type.substring(0, type.length() - 2))) {
            return type.substring(0, type.length() - 2);
        }
        Matcher list = LIST.matcher(type);
        return list.matches() ? BOXED_TO_SCALAR.get(list.group(1)) : null;
    }

    static boolean isSupported(String type) {
        return scalarOf(type) != null;
    }

    private static boolean isScalar(String type) {
        return type.equals("int") || type.equals("long") || type.equals("double")
                || type.equals("boolean") || type.equals("String");
    }

    private static boolean isCollection(String type) {
        return type.endsWith("[]") || type.startsWith("List<");
    }

    /** A sentence saying why {@code value} does not fit {@code type}, or null when it does. */
    static String problemWith(String type, JsonNode value) {
        String scalar = scalarOf(type);
        if (isCollection(type)) {
            if (value.isNull()) {
                return null;
            }
            if (!value.isArray()) {
                return "esperado uma lista [..]";
            }
            for (int i = 0; i < value.size(); i++) {
                String problem = scalarProblem(scalar, value.get(i));
                if (problem != null) {
                    return "item " + (i + 1) + ": " + problem;
                }
            }
            return null;
        }
        return scalarProblem(scalar, value);
    }

    private static String scalarProblem(String scalar, JsonNode value) {
        if (value.isNull()) {
            return scalar.equals("String") ? null : "null so vale para String, array e lista";
        }
        return switch (scalar) {
            case "boolean" -> value.isBoolean() ? null : "esperado true ou false";
            case "String" -> value.isTextual() ? null : "esperado um texto entre aspas";
            case "int" -> value.isIntegralNumber() && value.canConvertToInt() ? null
                    : value.isIntegralNumber() ? "fora do intervalo de int" : "esperado um numero inteiro";
            case "long" -> value.isIntegralNumber() && value.canConvertToLong() ? null : "esperado um numero inteiro";
            case "double" -> value.isNumber() ? null : "esperado um numero";
            default -> "tipo desconhecido";
        };
    }
}
