(function(){

jstack.component = {};

var loadComponent = function(){
	var el = this;
	var component = $(el).attr('j-component');
	if(!component){
		return;
	}
	var config = $(el).dataAttrConfig('j-data-');
	var paramsData = $(el).attr('j-params-data');
	var load = function(){
		var o;
		var c = jstack.component[component];
		if(paramsData){
			var params = [];
			params.push(el);
			 o = new (Function.prototype.bind.apply(c, params));
		}
		else{
			o = new c(el,config);
		}
		$(el).data('j:component',o);			
	};
	if(jstack.component[component]){
		load();
	}
	else{					
		$js('jstack.'+component,load);
	}
};

var loadJqueryComponent = function(){
	var el = this;
	var component = $(el).attr('jquery-component');
	var config = $(el).dataAttrConfig('j-data-');
	var paramsData = $(el).attr('j-params-data');
	var params = [];
	if(paramsData){
		var keys = [];
		for (var k in config) {
			if (config.hasOwnProperty(k)) {
				keys.push(k);
			}
		}
		keys.sort();
		for(var i=0,l=keys.length;i<l;i++){
			params.push(config[keys[i]]);
		}
	}
	else if(!$.isEmptyObject(config)){
		params.push(config);
	}
	var load = function(){
		$(el).data('j:component',$.fn[component].apply($(el), params));
	};
	if($.fn[component]){
		load();
	}
	else{					
		$js('jstack.jquery.'+component,load);
	}
};

$.on('j:load','[j-component]',loadComponent);
$.on('j:load','[jquery-component]',loadJqueryComponent);
$.on('j:unload','[j-component]',function(){
	var o = $(this).data('j:component');
	if(o&&typeof(o.unload)=='function'){
		o.unload();
	}
});

$('[j-component]').each(function(){
	if( !$(this).data('j:component') ){
		loadComponent.call(this);
	}
});
$('[jquery-component]').each(function(){
	if( !$(this).data('j:component') ){
		loadJqueryComponent.call(this);
	}
});

//use j:load event to make loader definition helper
jstack.loader = function(selector,handler,unloader){
	$.on('j:load',selector,function(){
		handler.call(this);
	});
	if(typeof(unloader)=='function'){
		$.on('j:unload',selector,function(){
			unloader.call(this);
		});
	}
	$(selector).each(function(){
		handler.call(this);
	});
};


//define preloaders
jstack.preloader = {
	'[j-if]':function(){
		jstack.dataBinder.loaders.jIf.call(this);
	},
	'[j-switch]':function(){
		jstack.dataBinder.loaders.jSwitch.call(this);
	},
	'[j-repeat]':function(){
		jstack.dataBinder.loaders.jRepeat.call(this);
		jstack.dataBinder.loaders.jRepeatList.call($(this).data('parent')[0]);
	},
	'[j-repeat-list]':function(){
		jstack.dataBinder.loaders.jRepeatList.call(this);
	},
	'[j-for]':function(){
		jstack.dataBinder.loaders.jFor.call(this);
		jstack.dataBinder.loaders.jForList.call($(this).data('parent')[0]);
	},
	'[j-for-list]':function(){
		jstack.dataBinder.loaders.jForList.call(this);
	},
	':input[name]':function(){		
		jstack.dataBinder.inputToModel(this,'j:default',true);
		jstack.dataBinder.loaders.inputWithName.call(this);
	},
	':input[j-val]':function(){
		jstack.dataBinder.loaders.inputWithJval.call(this);
	},
	':data(j-var)':function(){
		jstack.dataBinder.loaders.jVar.call(this);
	},
	':attrStartsWith("j-var-")':function(){
		jstack.dataBinder.loaders.jVarAttr.call(this);
	},
	':attrStartsWith("j-model-")':function(){
		jstack.dataBinder.loaders.jModelAttr.call(this);
	},
	':attrStartsWith("j-shortcut-model-")':function(){
		jstack.dataBinder.loaders.jShrotcutModelAttr.call(this);
	},
};

//define loaders
jstack.loader(':attrStartsWith("j-on-")',function(){
	var $this = $(this);
	var attrs = $this.attrStartsWith('j-on-');
	$.each(attrs,function(k,v){
		var event = k.substr(5);
		$this.removeAttr(k);
		$this.on(event,function(e){
			var controller = jstack.dataBinder.getControllerObject(this);
			if(typeof(controller.methods)!='object'||typeof(controller.methods[v])!='function'){
				throw new Error('Call to undefined method "'+v+'" by '+k+' and expected in controller '+controller.name);
			}
			var method = controller.methods[v];
			if(typeof(method)!='function'){
				return;
			}
			var r = method.call(controller,e,this);
			if(r===false){
				return false;
			}
		});
	});
});



})();