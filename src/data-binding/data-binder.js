class dataBinder {
	
	constructor(model,view,controller){
		this.model = model;
		this.view = view;
		this.controller = controller;
		
		this.updateDeferQueued = false;
		this.updateDeferInProgress = false;
		this.updateDeferStateObserver = null;
		
		this.loadingMutation = 0;
		this.deferMutation = [];
		
		this.noChildListNodeNames = {area:1, base:1, br:1, col:1, embed:1, hr:1, img:1, input:1, keygen:1, link:1, menuitem:1, meta:1, param:1, source:1, track:1, wbr:1, script:1, style:1, textarea:1, title:1, math:1, svg:1, canvas:1};
		
		this.watchers = new WeakMap();
	}
	ready(callback){
		let self = this;
		let when = $.Deferred();
		let defers = [];
		
		setTimeout(function(){
			
			
			if(self.updateDeferStateObserver){
				defers.push(self.updateDeferStateObserver);
			}
		
			if(self.loadingMutation>0){
				var deferMutation = $.Deferred();
				self.deferMutation.push(function(){
					deferMutation.resolve();
				});
				defers.push(deferMutation);
			}
			
			$.when.apply($,defers).then(function(){
				when.resolve();
			});

			
			if(callback){
				when.then(function(){
					callback();
				});
			}
			
		});
		
		return when.promise();
	}
	getValue(el,varKey,defaultValue){
		var key = '';

		var ns = dataBinder.getClosestFormNamespace(el.parentNode);
		if(ns){
			key += ns+'.';
		}

		key += varKey;

		return dataBinder.dotGet(key,this.model,defaultValue);
	}
	getParentsForId(el){
		var a = [];
		var n = el;
		while(n){
			if(n.nodeType===Node.COMMENT_NODE&&n.nodeValue.split(' ')[0]==='j:for:id'){
				a.push(n);
				n = n.parentNode;
			}
			if(n){
				if(n.previousSibling){
					n = n.previousSibling;
				}
				else{
					n = n.parentNode;
				}
			}
			if(n===document.body) break;
		}
		return a;
	}
	getValueEval(el,varKey){

		let controller = this.controller;
		let scopeValue = this.model;

		scopeValue = scopeValue ? JSON.parse(JSON.stringify(scopeValue)) : {}; //clone Proxy
		if(typeof(varKey)=='undefined'){
			varKey = 'undefined';
		}
		else if(varKey===null){
			varKey = 'null';
		}
		else if(varKey.trim()==''){
			varKey = 'undefined';
		}
		else{
			varKey = varKey.replace(/[\r\t\n]/g,'');
			varKey = varKey.replace(/(?:^|\b)(this)(?=\b|$)/g,'$this');
		}


		var forCollection = this.getParentsForId(el).reverse();

		for(let i = 0, l = forCollection.length; i<l; i++){
			let forid = forCollection[i];

			let parentFor = $(forid);
			let parentForList = parentFor.parentComment('j:for');

			if(!parentForList.length) continue;

			let jforCommentData = parentForList.dataComment();
			let value = jforCommentData.value;
			
			let forRow = parentFor.dataComment('j:for:row');
			
			if(!forRow){
				console.log(varKey, el, parentFor, parentFor.dataComment());
			}
			
			let index = jforCommentData.index;
			let key = jforCommentData.key;
			if(index){
				scopeValue[index] = forRow.index;
			}
			if(key){
				scopeValue[key] = forRow.key;
			}
			scopeValue[value] = forRow.value;
		}

		var params = [ '$controller', '$this', '$scope' ];
		var args = [ controller, el, scopeValue ];
		$.each(scopeValue,function(param,arg){
			params.push(param);
			args.push(arg);
		});

		params.push("return "+varKey+";");

		var value;
		try{
			var func = Function.apply(null,params);
			value = func.apply(null,args);
		}

		catch(jstackException){
			if(jstack.config.debug){
				var warn = [jstackException.message, ", expression: "+varKey, "element", el];
				if(el.nodeType==Node.COMMENT_NODE){
					warn.push($(el).parent().get());
				}
				console.warn.apply(console,warn);
			}
		}
		
		return typeof(value)=='undefined'?'':value;
	}
	inputToModel(el,eventType,triggeredValue){
		var input = $(el);

		var self = this;

		var data = this.model;
		var name = el.getAttribute('name');

		var performInputToModel = function(){
			var key = dataBinder.getScopedInput(el);
			if(filteredValue!=value){
				value = filteredValue;
				input.populateInput(value,{preventValEvent:true});
			}

			var oldValue = dataBinder.dotGet(key,data);

			value = dataBinder.dotSet(key,data,value);
			input.trigger('j:input',[value]);

			if(eventType=='j:update'){
				input.trigger('j:input:update',[value]);
			}
			else{
				input.trigger('j:input:user',[value]);
			}

			if(oldValue!==value){
				input.trigger('j:change',[value,oldValue]);
			}
		};

		var value;
		if(typeof(triggeredValue)!=='undefined'){
			value = triggeredValue;
		}
		else{
			value = dataBinder.getInputVal(el);
		}
		
		var filteredValue = this.filter(el,value);


		if(typeof(filteredValue)=='object'&&filteredValue!==null&&typeof(filteredValue.promise)=='function'){
			filteredValue.then(function(val){
				filteredValue = val;
				performInputToModel();
			});
		}
		else{
			performInputToModel();
		}

	}
	addWatcher(el,render){
		let w = this.watchers;
		let watchers = w.get(el);
		//let watchers = el.__jstackWatchers;
		if(!watchers){
			watchers = [];
			w.set(el,watchers);
			//el.__jstackWatchers = watchers;
		}
		watchers.push(render);
	}
	runWatchers(){
		var self = this;
		let w = this.watchers;
		//console.log('update');
		
		let now = new Date().getTime();
		console.log('runWatchers START');
		let c = 0;
		
		jstack.walkTheDOM( this.view, function(n){
			let watchers = w.get(n);
			//let watchers = n.__jstackWatchers;
			if(watchers){
				for(let i = 0, l = watchers.length; i < l; i++){
					watchers[i]();
					c++;
					
				}
			}
		});
		
		console.log('runWatchers END',c,(((new Date().getTime())-now)/1000)+'s');
	}

	update(){
		//console.log('update');
		var self = this;
		if(this.updateDeferQueued){
			return;
		}
		if(this.updateDeferInProgress){
			this.updateDeferQueued = true;
		}
		else{
			this.updateDeferInProgress = true;
			if(!this.updateDeferStateObserver){
				this.updateDeferStateObserver = $.Deferred();
			}
			setTimeout(function(){
				self.runWatchers();
				if(self.updateDeferQueued){
					self.updateDeferInProgress = false;
					self.updateDeferQueued = false;
					self.update();
				}
				else{
					self.updateDeferStateObserver.resolve();
					self.updateDeferStateObserver = null;
					self.updateDeferInProgress = false;
				}
			},10);
			
		}
	}

	eventListener(){
		let self = this;
		
		self.observe(this.view, true);
		
		$(this.view).on('input change j:update', ':input[name]', function(e,value){
			if(this.type=='file') return;
			if(e.type=='input'&&(this.nodeName.toLowerCase()=='select'||this.type=='checkbox'||this.type=='radio'))
				return;
			let el = this;
			setTimeout(function(){
				self.inputToModel(el,e.type,value);
			});
		});
		
	}
	observe(n, root){
		if(n.nodeType!=Node.ELEMENT_NODE || this.noChildListNodeNames[n.tagName.toLowerCase()]) return;
		
		if(!root&&n.hasAttribute('j-view')){
			return;
		}
		
		if(n.hasAttribute('j-escape')){
			return false;
		}

		let self = this;
		let mutationObserver = new MutationObserver(function(m){
			//console.log(m);
			self.loadingMutation++;
			setTimeout(function(){
				self.loadMutations(m);
			});
		});
		mutationObserver.observe(n, {
			subtree: false,
			childList: true,
			characterData: true,
			attributes: false,
			attributeOldValue: false,
			characterDataOldValue: false,
		});
		//$(n).data('j:observer',mutationObserver);
	}
	loadMutations(mutations){
		//console.log('mutations',mutations);

		let self = this;

		let compilerJloads = [];
		
		$.each(mutations,function(i,mutation){
			$.each(mutation.addedNodes,function(ii,node){
				self.compileNode(node,compilerJloads);
			});

			$.each(mutation.removedNodes,function(ii,node){
				jstack.walkTheDOM(node,function(n){
					if(n.nodeType!==Node.ELEMENT_NODE || !$(n).data('j:load:state')){
						return false;
					}
					jstack.trigger(n,'unload');
				});
			});
		});

		setTimeout(function(){
			self.loadingMutation--;
			
			if(self.loadingMutation==0){
				while(self.deferMutation.length){
					self.deferMutation.pop()();
				}
			}
			
			for(let i = 0, l=compilerJloads.length;i<l;i++){
				compilerJloads[i]();
			}
			
		});

	}
	
	compileNode(node,compilerJloads){
		var self = this;

		jstack.walkTheDOM(node,function(n){
			if(!document.body.contains(n)) return false;

			if(self.observe(n)===false){
				return false;
			}

			var $n = $(n);
			
			/*
			if((n.nodeType == Node.TEXT_NODE) && (n instanceof Text)){
				var renders = self.compilerText(n);
				if(renders){
					for(var i = 0, l=renders.length;i<l;i++){
						self.addWatcher(renders[i],99);
						renders[i]();
					}
				}
				return;
			}
			*/

			if(n.nodeType!=Node.ELEMENT_NODE) return;

			/*
			var once = n.hasAttribute('j-once');
			if(once){
				jstack.walkTheDOM(n,function(el){
					if(el.nodeType==Node.ELEMENT_NODE){
						el.setAttribute('j-once-element','true');
					}
				});
				n.removeAttribute('j-once');
			}
			else{
				once = n.hasAttribute('j-once-element');
				if(once){
					n.removeAttribute('j-once-element');
				}
			}
			
			$.each(jstack.dataBindingCompilers,function(k,compiler){
				var matchResult = compiler.match.call(n);
				if(matchResult){
					var render = compiler.callback.call(n,self,matchResult);
					if(render){
						if(!once){
							self.addWatcher(render, compiler.level);
						}
						render();
						
						//if(!document.contains(n)){
							//return false;
						//}
						
					}
				}
			});
			*/
			if(!document.body.contains(n)) return false;


			compilerJloads.push(function(){
				if(!document.body.contains(n)) return;
				if(n.hasAttribute('j-cloak')){
					n.removeAttribute('j-cloak');
				}
				if($n.data('j:load:state')){
					return;
				}
				$n.data('j:load:state',true);
				jstack.trigger(n,'load');
			});

		});

	}
	
	
	compileHTML(html){
		let self = this;
		
		let dom = $('<html><rootnode>'+html+'</rootnode></html>').get(0);
		
		$.each(jstack.dataBindingCompilers,function(k,compiler){
			
			jstack.walkTheDOM(dom,function(n){
				
				var matchResult = compiler.match.call(n);
				if(matchResult){
					compiler.callback.call(n,self,matchResult);
				}
				
			});
			
		});
				
		return dom.childNodes;
	}
	
	
	filter(el,value){
		var filter = this.getFilter(el);
		if(typeof(filter)=='function'){
			value = filter(value);
		}
		return value;
	}
	getFilter(el){
		let $el = $(el);
		var filter = $el.data('j-filter');
		if(!filter){
			var attrFilter = el.getAttribute('j-filter');
			if(attrFilter){
				var method = this.getValue(el,attrFilter);
				$el.data('j-filter',method);
			}
		}
		return filter;
	}
	compilerAttrRender(el,tokens){
		var r = '';
		for(var i = 0, l = tokens.length; i<l; i++){
			var token = tokens[i];
			if(token.substr(0,2)=='{{'){
				token = token.substr(2,token.length-4);
				
				let freeze = false;
				if(token.substr(0,2)=='::'){
					token = token.substr(2);
					freeze = true;
				}
				
				token = this.getValueEval(el,token);
			}
			r += typeof(token)!=='undefined'&&token!==null?token:'';
		}
		return r;
	}
	createCompilerAttrRender(el,tokens){
		let self = this;
		return function(){
			return self.compilerAttrRender(el,tokens);
		};
	}
	static textTokenizer(text){
		var tagRE = /\{\{((?:.|\n)+?)\}\}/g;
		if (!tagRE.test(text)) {
			return false;
		}
		var tokens = [];
		var lastIndex = tagRE.lastIndex = 0;
		var match, index;
		while ((match = tagRE.exec(text))) {
			index = match.index;
			// push text token
			if (index > lastIndex) {
				tokens.push(text.slice(lastIndex, index));
			}
			// tag token
			var exp = match[1].trim();
			tokens.push("{{" + exp + "}}");
			lastIndex = index + match[0].length;
		}
		if (lastIndex < text.length) {
			tokens.push(text.slice(lastIndex));
		}
		return tokens;
	}
	static dotGet(key,data,defaultValue){
		if(typeof(data)!='object'||data===null){
			return;
		}
		return key.split('.').reduce(function(obj,i){
			if(typeof(obj)=='object'&&obj!==null){
				return typeof(obj[i])!='undefined'?obj[i]:defaultValue;
			}
			else{
				return defaultValue;
			}
		}, data);
	}
	static dotSet(key,data,value,isDefault){
		if(typeof(data)!='object'||data===null){
			return;
		}
		key.split('.').reduce(function(obj,k,index,array){
			if(array.length==index+1){
				if(isDefault){
					if(typeof(obj[k])==='undefined'){
						
						obj = jstack.getObserverTarget( obj );
						
						obj[k] = value;
						
					}
					else{
						value = obj[k];
					}
				}
				else{
					obj[k] = value;
				}
			}
			else{
				if(typeof(obj[k])!='object'||obj[k]===null){
					obj[k] = {};
				}
				return obj[k];
			}
		}, data);
		return value;
	}
	static dotDel(key,data,value){
		if(typeof(data)!='object'||data===null){
			return;
		}
		key.split('.').reduce(function(obj,k,index,array){
			if(typeof(obj)!='object'){
				return;
			}
			if(array.length==index+1){
				if(typeof(obj[k])!='undefined'){
					delete obj[k];
				}
			}
			else{
				return obj[k];
			}
		}, data);
	}
	static getKey(key){
		return key.replace( /\[(["']?)([^\1]+?)\1?\]/g, ".$2" ).replace( /^\./, "" ).replace(/\[\]/g, '.');
	}
	static getClosestFormNamespace(p){
		while(p){
			if(p.tagName&&p.tagName.toLowerCase()=='form'){
				if(p.hasAttribute('j-name')){
					return p.getAttribute('j-name');
				}
				break;
			}
			p = p.parentNode;
		}
	}
		static getScopedInput(input){
		var name = input.getAttribute('name');
		var key = dataBinder.getKey(name);
		if(key.substr(-1)=='.'&&input.type=='checkbox'){
			var index;
			$(dataBinder.getController(input.parentNode)).find(':checkbox[name="'+name+'"]').each(function(i){
				if(this===input){
					index = i;
					return false;
				}
			});
			key += index;
		}
		var scopeKey = '';
		var ns = dataBinder.getClosestFormNamespace(input.parentNode);
		if(ns){
			scopeKey += ns+'.';
		}
		scopeKey += key;
		return scopeKey;
	}
	static getInputVal(el){
		let nodeName = el.tagName.toLowerCase();
		switch(nodeName){
			case 'input':
				switch(el.type){
					case 'checkbox':
						var $el = $(el);
						return $el.prop('checked')?$el.val():'';
					break;
					case 'radio':
						var form;
						var p = el.parentNode;
						while(p){
							if(p.tagName&&p.tagName.toLowerCase()=='form'){
								form = p;
								break;
							}
							p = p.parentNode;
						}
						if(form){
							var checked = $(form).find('[name="'+el.getAttribute('name')+'"]:checked');
							return checked.length?checked.val():'';
						}
						return '';
					break;
					case 'file':
						return el.files;
					break;
					case 'submit':
					break;
					default:
						return $(el).val();
					break;
				}
			break;
			case 'textarea':
			case 'select':
				return $(el).val();
			break;
			case 'j-select':
				el = $(el);
				var multiple = el[0].hasAttribute('multiple');
				var data = el.data('preselect');
				if(!data){
					if(multiple){
						data = [];
					}
					el.children().each(function(){
						if(this.hasAttribute('selected')){
							var val = this.value;
							if(multiple){
								data.push(val);
							}
							else{
								data = val;
								return false;
							}
						}
					});
				}
				return data;
			break;
			default:
				return $(el).html();
			break;
		}
	}
	static getControllerData(el){
		return $(dataBinder.getController(el)).data('jModel');
	}
	static getController(p){

		let controller;
		
		while(p){
			if(p.hasAttribute&&p.hasAttribute('j-controller')){
				controller = p;
				break;
			}
			p = p.parentNode;
		}
		

		if(!controller){
			controller = document.body;
			controller.setAttribute('j-controller','')
			$(controller).data('jModel',{});
		}

		return controller;
	}
	static getControllerObject(el){
		return $(dataBinder.getController(el)).data('jController');
	}
}
jstack.dataBinder = dataBinder;