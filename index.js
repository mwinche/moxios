'use strict';

function deepContained(obj1, obj2){
  if(obj1 === obj2){
    return true;
  }

  if(!obj1 || !obj2){
    return false;
  }

  return Object.keys(obj1)
    .reduce(function(matches, key){
      return matches && deepContained(obj1[key], obj2[key]);
    }, true);
}

function conditionFactory(expectedConfig, result){
  return function(actualConfig){
    if(!deepContained(expectedConfig, actualConfig)){
      return undefined;
    }

    if(typeof result === 'function'){
      return result.call(undefined, actualConfig);
    }

    return result;
  };
}

module.exports = function(){
  var conditions = [];

  var api = {
    when: function(condition, data, config){
      if(typeof condition === 'function'){
        conditions.push(condition);
      }
      else{
        var config = config || {};
        config.data = data || config.data;
        config.url = condition;

        return {
          return: function(result){
            api.when(conditionFactory(config, result));

            return api;
          }
        };
      }

      return api;
    },
    axios: function(config){
      var result = conditions.reduce(function(result, conditionFN){
        return result || conditionFN(config);
      }, undefined);

      if(result === undefined){
        throw {
          message: "Request " + config.method + " " + config.url + " not handled",
          request: config
        };
      }

      //Wrap it in a promise just to be sure. Promise API guarantees that if
      //`result` is a rejected promise, `Promise.resolve(result)` will reject
      //with the same value, likewise for resolved promises.
      return Promise.resolve(result);
    }
  };

  ['get', 'delete', 'head'].reduce(function(axios, method){
    axios[method] = function(url, config){
      config = config || {};
      config.url = url;
      config.method = method;

      return axios(config);
    };

    return axios;
  }, api.axios);

  ['get', 'delete', 'head'].reduce(function(when, method){
    when[method] = function(url, expectedConfig){
      expectedConfig = expectedConfig || {};
      expectedConfig.url = url;
      expectedConfig.method = method;

      return {
        return: function(result){
          when(conditionFactory(expectedConfig, result));
        }
      };
    };

    return when;
  }, api.when);

  ['post', 'put', 'patch'].reduce(function(axios, method){
    axios[method] = function(url, data, config){
      config = config || {};
      config.url = url;
      config.data = data || config.data;
      config.method = method;

      return axios(config);
    };

    return axios;
  }, api.axios);

  ['post', 'put', 'patch'].reduce(function(when, method){
    when[method] = function(url, data, expectedConfig){
      expectedConfig = expectedConfig || {};
      expectedConfig.url = url;
      expectedConfig.data = data || config.data;
      expectedConfig.method = method;

      return {
        return: function(result){
          when(conditionFactory(expectedConfig, result));
        }
      };
    };

    return when;
  }, api.when);

  return api;
};
