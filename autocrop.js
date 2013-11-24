var autocrop = {
	hover_class: 'autocropHover',
	queue: [],
	item_pos: 0,
	pixelCoords: {x: 0, y: 0},
	alphaPixel: 0,
	process_queue: function() {
		var item = null;
		while (typeof (item = this.queue.shift()) != 'undefined') {
			item.item.autocrop_apply(item.options);
		}
	},
	canvas: document.createElement('canvas'),
	item_position: function (e) {
		var x = 0, y = 0;
		var inner = true ;
		do {
			x += e.offsetLeft;
			y += e.offsetTop;
			var style = getComputedStyle(e,null) ;
			var borderTop = parseInt(style.getPropertyValue("border-top-width"), 10);
			var borderLeft = parseInt(style.getPropertyValue("border-left-width"), 10);
			y += borderTop ;
			x += borderLeft ;
			if (inner){
				var paddingTop = parseInt(style.getPropertyValue("padding-top"), 10);
				var paddingLeft = parseInt(style.getPropertyValue("padding-left"), 10);
				y += paddingTop ;
				x += paddingLeft ;
			}
			inner = false ;
		} while (e = e.offsetParent);
		return { x: x, y: y };
	}
}

HTMLImageElement.prototype.map = [];
HTMLImageElement.prototype.patchedEvents = [];
HTMLImageElement.prototype.has_mouseover_fired = false;
HTMLImageElement.prototype.realAddEventListener = HTMLImageElement.prototype.addEventListener;

HTMLImageElement.prototype.autocrop_apply = function(settings) {
	//TODO: make default options list and merge with settings
	settings = (typeof settings == 'undefined') ? {} : settings;
	autocrop.canvas.width = this.width;
	autocrop.canvas.height = this.height;
	var autocrop_ctx = autocrop.canvas.getContext('2d');
	autocrop_ctx.drawImage(this, 0, 0);
	this.map = {width: this.width, height: this.height, data: autocrop_ctx.getImageData(0, 0, this.width, this.height).data};

	var item_selector = {item: this, selector: '', selector_hover: ''};
	var item_class = '';
	while(item_selector.item.nodeName.toLowerCase() != 'body') {
		item_class = item_selector.item.getAttribute('class');
		item_selector.selector = item_selector.item.nodeName.toLowerCase() + (item_class==null ? '' : ('.' + item_class.replace(/\s+/g, '.'))) + ' ' + item_selector.selector;
		item_selector.item = item_selector.item.parentNode;
	}
	//TODO: create 1 base selector, then build pseudo selectors from it (only for those pseudo selectors for which we have settings)
	item_selector.selector = item_selector.selector.substr(0, item_selector.selector.length-1);
	//item_selector.selector_hover = item_selector.selector + ':hover{}';
   	item_selector.selector += '.' + autocrop.hover_class + ' {'+ (typeof settings.hover == 'undefined' ? '' : settings.hover) +'}';
	var lastStyleSheet = document.styleSheets[document.styleSheets.length-1];
	lastStyleSheet.insertRule(item_selector.selector, lastStyleSheet.cssRules.length);
	//lastStyleSheet.insertRule(item_selector.selector_hover, lastStyleSheet.cssRules.length);
}

/**
 * Override the default addEventListener function
 * The idea is to set an autocrop specific function as the first event handler,
 * so it can evenually block an event from firing if neccessary
 */
HTMLImageElement.prototype.addEventListener = function(a, b, c) {
	if (this.patchedEvents.indexOf(a) == -1) {
		this.patchedEvents.push(a);
		this.realAddEventListener(a, function(e) { autocrop.item_pos = autocrop.item_position(e.target); autocrop.pixelCoords = {x: e.pageX - autocrop.item_pos.x, y: e.pageY - autocrop.item_pos.y};
			autocrop.alphaPixel = (4 * this.map.width * autocrop.pixelCoords.y) + (4 * autocrop.pixelCoords.x) + 3;

			if (this.map.data[autocrop.alphaPixel] == 0) {//event is over an alpha pixel
				e.stopImmediatePropagation();
				if (this.has_mouseover_fired) {//Mouse is in the image and just got from non-alpha pixel into alpha pixel. We need to fire a mouseout event so event handlers for mouseout can run.
					this.has_mouseover_fired = false;
					this.classList.remove(autocrop.hover_class);
					debugger;
					//this.dispatchEvent(new Event('mouseout'));
				}
			} else {
				if (!this.has_mouseover_fired) {
					this.has_mouseover_fired = true;
					this.classList.add(autocrop.hover_class);
					debugger;
				/*	var mouseoverEvent = document.createEvent ("MouseEvent");
					mouseoverEvent.initMouseEvent ("mouseover", true, true, window, 0,
						e.screenX, e.screenY, e.clientX, e.clientY,
						e.ctrlKey, e.altKey, e.shiftKey, e.metaKey,
						0, null);
					this.dispatchEvent(mouseoverEvent);*/
				}
			}
		});
	}
	this.realAddEventListener.apply(this, arguments);
}

HTMLImageElement.prototype.autocrop = function(opts) {
	autocrop.queue.push({item:this, options: opts});
	return this;
}

window.onload = function() {
	autocrop.process_queue();
}
