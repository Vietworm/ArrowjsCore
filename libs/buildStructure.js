"use strict";

let _ = require("lodash");
let path = require('path');
let globalPattern = {};

module.exports = function (struc) {
    let arrStruc = {};
    Object.keys(struc).map(function (key) {
        arrStruc[key] = getDataFromArray(struc[key], key,1);
    });
    return arrStruc
};
/*

*/
function getDataFromArray(obj, key,level) {
    let newObj = {};
    let wrapArray = [];
    if (_.isArray(obj)) {
        wrapArray = obj;
    } else if (_.isObject(obj)) {
        wrapArray.push(obj);
    }
    let baseObject = wrapArray[0];
    newObj.path = {};
    newObj.type = "single";
    wrapArray.map(function (data, index) {
        //handle path
        if (data.path) {
            data = _.assign(baseObject, data);
            let pathInfo = handlePath(data.path, key,level);

            if (!_.isEmpty(pathInfo[1])) {
                newObj.type = "multi";
            }
            let pathKey = pathInfo[1] || index;
            newObj.path[pathKey] = {};
            newObj.path[pathKey].path = pathInfo[0];
            Object.keys(data).map(function (key) {
                if (key === "extends") {
                    newObj.path[pathKey].extends = data.extends;
                }

                if (typeof data.key === 'function') {
                    newObj.path[pathKey][key] = data[key];
                }

                if (['controller', "view", "helper", "model", "route"].indexOf(key) > -1) {
                    if (_.isArray(data[key])) {
                        data[key].map(function (data_key) {
                            if (!data_key.path.singleton) {
                                data_key.path.singleton = true;
                            }
                        });
                    } else {
                        if (!data[key].path.singleton) {
                            data[key].path.singleton = true;
                        }
                    }
                    newObj.path[pathKey][key] = getDataFromArray(data[key], key ,2);
                } else {
                    if (key !== "extends" && key !== "path" && typeof data.key === 'object') {
                        newObj.path[pathKey][key] = data[key]
                    }
                }
            });

            if(data.path.prefix) {
                newObj.path[pathKey].prefix = handlePrefix(data.path.prefix);
            }

            if(data.path.authenticate) {
                newObj.path[pathKey].authenticate = handleAthenticate(data.path.authenticate);
            }
        } else {
            return null;
        }
    });
    return newObj
}
function handlePath(pathInfo, attribute,level) {
    if (pathInfo) {
        let singleton = handleSingleton(pathInfo.singleton);
        let folderName = handleFolder(pathInfo.folder);
        let depend = handleDepend(pathInfo.depend);
        let fileName = handleFile(pathInfo.file);
        let name = handleName(pathInfo.name);
        switch (attribute) {
            case "view":
                fileName = "";
                break;
            case "controller":
                break;
            case "helper":
                break;
            case "route":
                break;
            case "model":
                break;
            default:
                break;
        }

        switch (level) {
            case 1:
                if(name) {
                    console.log('Carefully : Cant set "name" attribute at level 1 in structure.js');
                }
                name = "";
                break;
            case 2:
                break;
            default:
                break;
        }

        let results = [];
        folderName.map(function (folderInfo) {
            let backInfo;
            if (folderInfo) {
                backInfo = singleton + "/" + fileName;
            } else {
                backInfo = fileName;
            }
            let frontkey = folderInfo || "";
            let result;
            if (folderInfo.indexOf("*") > -1) {
                if (depend) {
                    result = pathWithConfig(frontkey, backInfo).bind(null, depend);
                } else {
                    //TODO: When throw Error we need to log error somewhere. Your code will crash app !
                    throw Error("'folder' attribute not contain '*' without  'depend' attribute: " + folderInfo);
                }
            } else {
                result = pathWithConfig(frontkey, backInfo).bind(null, null);
            }
            results.push(result);
        });
        return [results, name];
    }
    return [null, null]
}

function handleSingleton(singleton) {
    if (!singleton) return "/*";
    return ""
}

function handleFolder(folder) {
    let newFolder = [];
    if (_.isArray(folder)) {
        folder.map(function (folderInfo) {
            newFolder.push(folderInfo)
        })
    }
    if (_.isString(folder)) {
        newFolder.push(folder);
    }
    if (!folder) {
        newFolder.push("");
    }
    return newFolder;
}

function handleName(name) {
    if (_.isString(name)) return name;
    return "";
}

function handleDepend(depend) {
    let newDepend = [];
    if (_.isArray(depend)) {
        depend.map(function (dependInfo) {
            newDepend.push(dependInfo)
        })
    }
    if (_.isString(depend)) {
        newDepend.push(depend);
    }
    return depend;
}

function handleFile(file) {
    if (_.isString(file)) {
        return file
    }
    return "";
}

function getConfigByKey(key) {
    return function (key) {
        let self = this;
        return self._config[key]
    }
}

function handlePrefix(prefix) {
    if (_.isString(prefix)) {
        return prefix
    }
    return "";
}

function handleAthenticate(authenticate){
    if(_.isBoolean(authenticate)){
        return authenticate
    }
    return false
}

function pathWithConfig(front, back) {
    return function makeGlob(key) {
        let config = arguments[1];
        let frontArray = front.split("*");
        let newFront = "";
        let newArray = [];
        if (_.isString(key)) {
            newArray.push(key);
        } else {
            newArray = key;
        }
        if (frontArray.length > 1) {
            frontArray.map(function (frontKey) {
                let index = frontArray.indexOf(frontKey);
                if (index < frontArray.length - 1) {
                    newFront += frontKey + ( config[newArray[index]] || "")
                } else {
                    newFront += frontKey
                }
            });
            newFront = newFront.replace(/\*/g, "");
            return path.normalize(newFront + back)
        }

        return path.normalize(front + back);
    }
}