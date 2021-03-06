(function(){

let prefix = '__JSTACK__OBSERVABLE__';

let observable = function(obj,options,parentProxy,parentKey){
	
	let observer = obj[prefix];
	if(observer){
		observer.parentKey = parentKey;
		observer.parentProxy = parentProxy;
		return obj;
	}
	
	if(!options){
		options = {};
	}
	
	if(options.factory){
		obj = options.factory(obj);
	}
	
	let notify = function(change,preventPropagation){
		observer.namespaces.each(function(callbackStack,namespace){
			
			if(preventPropagation[namespace]){
				return;
			}
			
			change.preventImmediatePropagation = false;
			change.stopPropagation = function(){
				preventPropagation[namespace] = true;
			};
			change.stopImmediatePropagation = function(){
				change.preventImmediatePropagation = true;
				preventPropagation[namespace] = true;
			};
			
			for(let i=0, l = callbackStack.length; i<l; i++){
				let callbackDef = callbackStack[i];
				if( !callbackDef.recursive && change.keyStack.length ){
					continue;
				}
				if( callbackDef.key !== false && callbackDef.key !== change.key ){
					continue;
				}
				let r = callbackDef.callback(change);
				if(r===false||change.preventImmediatePropagation){
					return;
				}
			}
		});
		
		if(observer.parentProxy){
			let parentObserver = observer.parentProxy[prefix];
			let bubbleChange = $.extend({},change);
			bubbleChange.keyStack.push(observer.parentKey);
			parentObserver.notify(bubbleChange,preventPropagation);
		}
	};
	
	let proxy;
	
	let factory = function(key,value){
		if(typeof(value)=='object'&&value!==null){
			value = observable(value, options, proxy, key);
		}
		return value;
	};
	
	observer = {
		namespaces:{},
		parentProxy:parentProxy,
		parentKey:parentKey,
		notify: notify,
		proxyTarget: obj,
		factory: factory,
	};
	
	proxy = new Proxy(obj,{
		get: function (target, key) {
			if(key===prefix){
				return observer;
			}
			return target[key];
		},
		set: function(target, key, value){
			
			let oldValue = target[key];
			
			value = factory(key,value);
			
			target[key] = value;
			
			notify({
				type:'set',
				target:target,
				keyStack: [],
				key:key,
				oldValue:oldValue,
				value:value,
			},{});
			
			return true;
		},
		deleteProperty: function (target, key) {
			
			let oldValue = target[key];
			
			
			if(Array.isArray(target))
				target.splice(key,1);
			else
				delete(target[key]);
			
			if(typeof(oldValue)=='object'&&oldValue!==null){
				let removedObserver = oldValue[prefix];
				if(removedObserver.parentProxy===proxy && removedObserver.parentKey===key){
					delete removedObserver.parentProxy;
					delete removedObserver.parentKey;
				}
			}
			
			notify({
				type:'unset',
				target:target,
				keyStack: [],
				key:key,
				oldValue:oldValue,
			},{});
			
			return true;
		},
		ownKeys: function(target){
			return Reflect.ownKeys(target);
		},
		
	});
	
	if(obj instanceof Array){
		for(let i = 0, l=obj.length; i<l; i++){
			let v = obj[i];
			if(typeof(v)=='object'&&v!==null){
				obj[i] = observable( v, options, proxy, i );
			}
		}
	}
	else{
		for(let k in obj){
			if(!obj.hasOwnProperty(k)){
				continue;
			}
			obj[k] = factory(k,obj[k]);
		}
	}
	
	if(options.factoryProxy){
		proxy = options.factoryProxy(proxy);
	}
	
	return proxy;
};

let observe = function(obj,key,callback,namespace,recursive){
	
	if(typeof(key)=='function'){
		recursive = namespace;
		namespace = callback;
		callback = key;
		key = false;
	}
	if(key===false||typeof(key)=='string'||typeof(key)=='number'){
		key = [key];
	}
	if(!namespace){
		namespace = 0;
	}
	
	let observer = obj[prefix];
	if(!observer){
		throw new Error('object is not observable');
	}
	if(!observer.namespaces[namespace]){
		observer.namespaces[namespace] = [];
	}
	let callbackStack = observer.namespaces[namespace];
	
	for(let i=0, l=key.length; i<l; i++){
		callbackStack.push({
			key: key[i],
			callback: callback,
			recursive: recursive,
		});
	}
};

let unobserve = function(obj,key,callback,namespace){
			
	if(key instanceof Array){
		for(let i=0, l = key.length; i<l; i++){
			unobserve(obj,key[i],callback,namespace);
		}
		return;
	}
	
	if(typeof(key)=='function'){
		namespace = callback;
		callback = key;
		key = false;
	}
	if(!namespace){
		namespace = 0;
	}
	
	let observer = obj[prefix];
	if(!observer){
		throw new Error('object is not observable');
	}
	
	let callbackStack = observer.namespaces[namespace];
	
	if(!callbackStack){
		return;
	}
	
	if(key || callback){
		for(let i=0, l = callbackStack.length; i<l; i++){
			let callbackDef = callbackStack[i];
			if( ( key === callbackDef.key ) && ( !callback || callback===callbackDef.callback ) ){
				callbackStack.splice(i,1);
			}
		}
	}
	else{
		callbackStack.length = 0;
	}
	
};

let getObserverTarget = function(obj){
	let original = obj;
	let observer = obj[prefix];
	if(observer){
		original = observer.proxyTarget;
	}
	return original;
};
let getObserver = function(obj){
	return obj[prefix];
};

jstack.observable = observable;
jstack.observe = observe;
jstack.unobserve = unobserve;
jstack.getObserverTarget = getObserverTarget;
jstack.getObserver = getObserver;

})();
