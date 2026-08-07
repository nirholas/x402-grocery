/**
 * Per-route x402 schemas — GENERATED FROM `openapi.json`, do not edit by hand.
 *
 * The x402 challenge a paid route answers with has to tell an agent two things
 * it cannot guess: how to call the route, and what it gets back for its money.
 * Both live under `accepts[].outputSchema` in the x402 Bazaar shape:
 *
 *     outputSchema.input   how to invoke  (method + path/query params or JSON body fields)
 *     outputSchema.output  the JSON Schema of the 200/201 body
 *
 * Keys match the paywall route map in `server.ts` exactly, so a route is
 * declared once and its schema is spread in:
 *
 *     "POST /thing": { price: "$0.01", description: "…", ...ROUTE_SCHEMAS["POST /thing"] }
 *
 * Everything here is copied verbatim from this service's OpenAPI document, so
 * the runtime 402 and the published spec can never drift apart.
 */

/** How an agent invokes a paid route. */
export type X402Input = {
  type: "http";
  method: string;
  /** Path segments, e.g. `:id` in `/cases/:id`. */
  pathParams?: Record<string, unknown>;
  queryParams?: Record<string, unknown>;
  queryRequired?: string[];
  bodyType?: "json";
  /** JSON Schema properties of the request body. */
  bodyFields?: Record<string, unknown>;
  bodyRequired?: string[];
};

/** The `outputSchema` object published in every `accepts[]` entry. */
export type X402RouteSchema = {
  input: X402Input;
  /** JSON Schema of the success response body. */
  output: Record<string, unknown>;
};

export type RouteSchemaEntry = { outputSchema: X402RouteSchema };

export const ROUTE_SCHEMAS: Record<string, RouteSchemaEntry> = {
  "GET /products": {
    "outputSchema": {
      "input": {
        "type": "http",
        "method": "GET",
        "queryParams": {
          "q": {
            "type": "string",
            "description": "Search term, e.g. `whole milk`."
          },
          "limit": {
            "type": "integer",
            "default": 10,
            "description": "Maximum products to return (1–50)."
          },
          "locationId": {
            "type": "string",
            "description": "Kroger store id to price against. Omit for the default location."
          }
        },
        "queryRequired": [
          "q"
        ]
      },
      "output": {
        "type": "object",
        "properties": {
          "source": {
            "type": "string"
          },
          "query": {
            "type": "string"
          },
          "locationId": {
            "type": "string"
          },
          "count": {
            "type": "integer"
          },
          "products": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "productId": {
                  "type": "string"
                },
                "upc": {
                  "type": "string"
                },
                "description": {
                  "type": "string"
                },
                "brand": {
                  "type": "string"
                },
                "category": {
                  "type": "string"
                },
                "size": {
                  "type": "string"
                },
                "price": {
                  "type": "object",
                  "properties": {
                    "regular": {
                      "type": "number"
                    },
                    "promo": {
                      "type": "number"
                    }
                  }
                },
                "aisle": {
                  "type": "string"
                },
                "stockLevel": {
                  "type": "string"
                }
              }
            }
          },
          "payment": {
            "type": "object",
            "properties": {
              "success": {
                "type": "boolean"
              },
              "rail": {
                "type": "string"
              },
              "network": {
                "type": "string"
              },
              "transaction": {
                "type": "string"
              },
              "payer": {
                "type": "string"
              },
              "amount": {
                "type": "string"
              },
              "asset": {
                "type": "string"
              },
              "resource": {
                "type": "string"
              }
            }
          }
        }
      }
    }
  },
  "POST /cart": {
    "outputSchema": {
      "input": {
        "type": "http",
        "method": "POST",
        "bodyType": "json",
        "bodyFields": {
          "items": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "query": {
                  "type": "string"
                },
                "quantity": {
                  "type": "integer"
                }
              }
            }
          },
          "locationId": {
            "type": "string"
          }
        }
      },
      "output": {
        "type": "object",
        "properties": {
          "source": {
            "type": "string"
          },
          "cartId": {
            "type": "string"
          },
          "locationId": {
            "type": "string"
          },
          "builtAt": {
            "type": "string"
          },
          "lines": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "requested": {
                  "type": "object",
                  "properties": {
                    "query": {
                      "type": "string"
                    },
                    "quantity": {
                      "type": "integer"
                    }
                  }
                },
                "matched": {
                  "type": "object",
                  "properties": {
                    "productId": {
                      "type": "string"
                    },
                    "upc": {
                      "type": "string"
                    },
                    "description": {
                      "type": "string"
                    },
                    "brand": {
                      "type": "string"
                    },
                    "category": {
                      "type": "string"
                    },
                    "size": {
                      "type": "string"
                    },
                    "price": {
                      "type": "object",
                      "properties": {
                        "regular": {
                          "type": "number"
                        },
                        "promo": {
                          "type": "number"
                        }
                      }
                    },
                    "aisle": {
                      "type": "string"
                    },
                    "stockLevel": {
                      "type": "string"
                    }
                  }
                },
                "substituted": {
                  "type": "boolean"
                },
                "substitutionNote": {
                  "type": [
                    "null",
                    "string"
                  ]
                },
                "unitPrice": {
                  "type": "number"
                },
                "lineTotal": {
                  "type": "number"
                }
              }
            }
          },
          "summary": {
            "type": "object",
            "properties": {
              "itemCount": {
                "type": "integer"
              },
              "matchedLines": {
                "type": "integer"
              },
              "unmatchedLines": {
                "type": "integer"
              },
              "substitutedLines": {
                "type": "integer"
              },
              "subtotal": {
                "type": "number"
              },
              "estimatedTax": {
                "type": "number"
              },
              "estimatedTotal": {
                "type": "number"
              }
            }
          },
          "payment": {
            "type": "object",
            "properties": {
              "success": {
                "type": "boolean"
              },
              "rail": {
                "type": "string"
              },
              "network": {
                "type": "string"
              },
              "transaction": {
                "type": "string"
              },
              "payer": {
                "type": "string"
              },
              "amount": {
                "type": "string"
              },
              "asset": {
                "type": "string"
              },
              "resource": {
                "type": "string"
              }
            }
          }
        }
      }
    }
  }
};
