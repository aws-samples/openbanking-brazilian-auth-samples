"use strict";
// This adapter is written in Typescript. If you want to get Javascript version without compiling it with tsc, paste this code here: https://babeljs.io/en/repl (choose Typescript preset)
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
exports.DynamoDBAdapter = void 0;
var aws_sdk_1 = require("aws-sdk");
var TABLE_NAME = process.env.OAUTH_TABLE;
var TABLE_REGION = process.env.AWS_REGION;
var dynamoClient = new aws_sdk_1.DynamoDB.DocumentClient({
    region: TABLE_REGION
});
var DynamoDBAdapter = /** @class */ (function () {
    function DynamoDBAdapter(name) {
        this.name = name;
    }
    DynamoDBAdapter.prototype.upsert = function (id, payload, expiresIn) {
        return __awaiter(this, void 0, void 0, function () {
            var expiresAt, params;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        expiresAt = expiresIn ? Math.floor(Date.now() / 1000) + expiresIn : null;
                        params = {
                            TableName: TABLE_NAME,
                            Key: { modelId: this.name + "-" + id },
                            UpdateExpression: "SET payload = :payload" +
                                (expiresAt ? ", expiresAt = :expiresAt" : "") +
                                (payload.userCode ? ", userCode = :userCode" : "") +
                                (payload.uid ? ", uid = :uid" : "") +
                                (payload.grantId ? ", grantId = :grantId" : ""),
                            ExpressionAttributeValues: __assign(__assign(__assign(__assign({ ":payload": payload }, (expiresAt ? { ":expiresAt": expiresAt } : {})), (payload.userCode ? { ":userCode": payload.userCode } : {})), (payload.uid ? { ":uid": payload.uid } : {})), (payload.grantId ? { ":grantId": payload.grantId } : {}))
                        };
                        return [4 /*yield*/, dynamoClient.update(params).promise()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    DynamoDBAdapter.prototype.find = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var params, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        params = {
                            TableName: TABLE_NAME,
                            Key: { modelId: this.name + "-" + id },
                            ProjectionExpression: "payload, expiresAt"
                        };
                        return [4 /*yield*/, dynamoClient.get(params).promise()];
                    case 1:
                        result = ((_a.sent()).Item);
                        // DynamoDB can take upto 48 hours to drop expired items, so a check is required
                        if (!result || (result.expiresAt && Date.now() > result.expiresAt * 1000)) {
                            return [2 /*return*/, undefined];
                        }
                        return [2 /*return*/, result.payload];
                }
            });
        });
    };
    DynamoDBAdapter.prototype.findByUserCode = function (userCode) {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var params, result;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        params = {
                            TableName: TABLE_NAME,
                            IndexName: "userCodeIndex",
                            KeyConditionExpression: "userCode = :userCode",
                            ExpressionAttributeValues: {
                                ":userCode": userCode
                            },
                            Limit: 1,
                            ProjectionExpression: "payload, expiresAt"
                        };
                        return [4 /*yield*/, dynamoClient.query(params).promise()];
                    case 1:
                        result = ((_a = (_b.sent()).Items) === null || _a === void 0 ? void 0 : _a[0]);
                        // DynamoDB can take upto 48 hours to drop expired items, so a check is required
                        if (!result || (result.expiresAt && Date.now() > result.expiresAt * 1000)) {
                            return [2 /*return*/, undefined];
                        }
                        return [2 /*return*/, result.payload];
                }
            });
        });
    };
    DynamoDBAdapter.prototype.findByUid = function (uid) {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var params, result;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        params = {
                            TableName: TABLE_NAME,
                            IndexName: "uidIndex",
                            KeyConditionExpression: "uid = :uid",
                            ExpressionAttributeValues: {
                                ":uid": uid
                            },
                            Limit: 1,
                            ProjectionExpression: "payload, expiresAt"
                        };
                        return [4 /*yield*/, dynamoClient.query(params).promise()];
                    case 1:
                        result = ((_a = (_b.sent()).Items) === null || _a === void 0 ? void 0 : _a[0]);
                        // DynamoDB can take upto 48 hours to drop expired items, so a check is required
                        if (!result || (result.expiresAt && Date.now() > result.expiresAt * 1000)) {
                            return [2 /*return*/, undefined];
                        }
                        return [2 /*return*/, result.payload];
                }
            });
        });
    };
    DynamoDBAdapter.prototype.consume = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var params;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        params = {
                            TableName: TABLE_NAME,
                            Key: { modelId: this.name + "-" + id },
                            UpdateExpression: "SET #payload.#consumed = :value",
                            ExpressionAttributeNames: {
                                "#payload": "payload",
                                "#consumed": "consumed"
                            },
                            ExpressionAttributeValues: {
                                ":value": Math.floor(Date.now() / 1000)
                            },
                            ConditionExpression: "attribute_exists(modelId)"
                        };
                        return [4 /*yield*/, dynamoClient.update(params).promise()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    DynamoDBAdapter.prototype.destroy = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var params;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        params = {
                            TableName: TABLE_NAME,
                            Key: { modelId: this.name + "-" + id }
                        };
                        return [4 /*yield*/, dynamoClient["delete"](params).promise()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    DynamoDBAdapter.prototype.revokeByGrantId = function (grantId) {
        return __awaiter(this, void 0, void 0, function () {
            var ExclusiveStartKey, params, queryResult, items, batchWriteParams;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        ExclusiveStartKey = undefined;
                        _b.label = 1;
                    case 1:
                        params = {
                            TableName: TABLE_NAME,
                            IndexName: "grantIdIndex",
                            KeyConditionExpression: "grantId = :grantId",
                            ExpressionAttributeValues: {
                                ":grantId": grantId
                            },
                            ProjectionExpression: "modelId",
                            Limit: 25,
                            ExclusiveStartKey: ExclusiveStartKey
                        };
                        return [4 /*yield*/, dynamoClient.query(params).promise()];
                    case 2:
                        queryResult = _b.sent();
                        ExclusiveStartKey = queryResult.LastEvaluatedKey;
                        items = queryResult.Items;
                        if (!items || !items.length) {
                            return [2 /*return*/];
                        }
                        batchWriteParams = {
                            RequestItems: (_a = {},
                                _a[TABLE_NAME] = items.reduce(function (acc, item) { return __spreadArrays(acc, [{ DeleteRequest: { Key: { modelId: item.modelId } } }]); }, []),
                                _a)
                        };
                        return [4 /*yield*/, dynamoClient.batchWrite(batchWriteParams).promise()];
                    case 3:
                        _b.sent();
                        _b.label = 4;
                    case 4:
                        if (ExclusiveStartKey) return [3 /*break*/, 1];
                        _b.label = 5;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    return DynamoDBAdapter;
}());
exports.DynamoDBAdapter = DynamoDBAdapter;
