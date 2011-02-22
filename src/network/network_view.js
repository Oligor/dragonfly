window.cls = window.cls || {};

/**
 * @constructor
 * @extends ViewBase
 */
cls.NetworkLogView = function(id, name, container_class, html, default_handler) {
  this._service = new cls.NetworkLoggerService()
  this._loading = false;
  this._scroll = 0;
  this._selected = null;

  this.createView = function(container)
  {
    this._render_main_view(container);
  };

  this.ondestroy = function()
  {
    if (this._scrollcontainer)
    {
      this._scroll = this._scrollcontainer.scrollTop;
    }
  }

  this._render_main_view = function(container)
  {
    var ctx = this._service.get_request_context();
    if (ctx && ctx.resources.length)
    {
      this._container = container;

      if (this._scrollcontainer)
      {
        this._scroll = this._scrollcontainer.scrollTop;
      }

      if (this._selected !== null)
      {
        var w = container.getBoundingClientRect().width - 250;
        var h = container.getBoundingClientRect().height;
        container.clearAndRender(templates.network_log_details(ctx, this._selected));
        this._scrollcontainer = container.querySelector(".network-details-url-list");
        this._scrollcontainer.scrollTop = this._scroll;

        var content = container.querySelector(".network-details-request");
        content.style.width = "" + w + "px";
      }
      else
      {
        var contheight = container.getBoundingClientRect().height - 2;
        var availwidth = container.getBoundingClientRect().width - 250 - window.defaults["scrollbar-width"];
        var duration = ctx.get_duration();
        var graphwidth = availwidth;

        if (duration > 3000)
        {
          graphwidth = Math.ceil(duration * 0.35);
        }

        container.clearAndRender(templates.network_log_main(ctx, graphwidth));
        this._scrollcontainer = container.querySelector("#main-scroll-container");
        this._scrollcontainer.style.height = "" + (contheight-window.defaults["scrollbar-width"]) + "px";
        this._scrollcontainer.scrollTop = this._scroll;
        container.className = "";

        var scrollable = container.querySelector("#main-scroll-container");
        var scrollercont = container.querySelector("#scrollbar-container");
        var scroller = container.querySelector("#scrollbar");
        scroller.style.width = "" + graphwidth + "px";

        container.querySelector("#left-side-content").style.minHeight = "" + (contheight-window.defaults["scrollbar-width"]) + "px";
        container.querySelector("#right-side-content").style.width = "" + graphwidth + "px";


        var scrollfun = function(evt) {
          var e = document.getElementById("right-side-container");
          e.scrollLeft = evt.target.scrollLeft;
        }
        scrollercont.addEventListener("scroll", scrollfun, false)
      }
    }
    else if (this._loading)
    {
      container.clearAndRender(
        ['div',
         ['p', "Loading page..."],
         'class', 'info-box'
        ]
      );
    }
    else
    {
      container.clearAndRender(
        ['div',
         ['button',
          'class', 'ui-button',
          'handler', 'reload-window'],
         ['p', "Click the reload button above to reload the debugged window and fetch its resources"],
         'class', 'info-box'
        ]
      );
    }
  };

  this._on_clicked_close_bound = function(evt, target)
  {
    this._selected = null;
    this.update();
  }.bind(this);

  this._on_clicked_request_bound = function(evt, target)
  {
    var rid = target.getAttribute("data-resource-id");
    rid = parseInt(rid);
    if (this._selected == rid)
    {
      this._selected = null;
    }
    else
    {
      this._selected = rid;
    }
    this.update();
  }.bind(this);


  // fixme: unify methods. Move bgcolor to css
  this._on_hover_request_bound = function(evt, target)
  {
    if (this._prev_hovered)
    {
      this._prev_hovered.setAttribute("fill", this._prev_hovered_color)
      this._prev_hovered.style.backgroundColor = "";
      this._prev_hovered = null;
    }
    var rid = target.getAttribute("data-resource-id");
    var ele = document.querySelector("rect[data-resource-id=\"" + rid + "\"]");
    if (ele) { 
      this._prev_hovered = ele;
      this._prev_hovered_color = ele.getAttribute("fill");
      ele.setAttribute("fill", "rgba(55,115,211,0.2)") 
    }
  }.bind(this);

  this._on_hover_request_graph_bound = function(evt, target)
  {
    if (this._prev_hovered)
    {
      this._prev_hovered.setAttribute("fill", this._prev_hovered_color)
      this._prev_hovered.style.backgroundColor = "";
      this._prev_hovered = null;
    }
    var rid = target.getAttribute("data-resource-id");
    var ele = document.querySelector("li[data-resource-id=\"" + rid + "\"]");

    if (ele) { 
      this._prev_hovered = ele;
      this._prev_hovered_color = ele.getAttribute("fill");
      ele.style.backgroundColor = "rgba(55,115,211,0.2)";
    }
  }.bind(this);

  this._on_clicked_get_body = function(evt, target)
  {
    var rid = target.getAttribute("data-resource-id");
    rid = parseInt(rid);
    this._service.request_body(rid, this.update.bind(this));
  }.bind(this);

  this._on_scroll_bound = function(evt)
  {
    this._container.querySelector(".resourcelist").scrollTop = evt.target.scrollTop;
  }.bind(this);

  this._on_abouttoloaddocument_bound = function()
  {
    this._loading = true;
    this._table = null;
    this._selected = null;
    this.update();
  }.bind(this);

  this._on_documentloaded_bound = function()
  {
    this._loading = false;
    this.update();
  }.bind(this);

  var eh = window.eventHandlers;
  // fixme: this is in the wrong place! Doesn't belong in UI and even if it
  // did, the event handler doesn't get added until the view is created
  // which means you can't open tabs from elsewhere if you haven't opened
  // the resources view first
  //  eh.click["resources-all-open"] = this._handle_open_resource_bound;

  eh.click["select-network-request"] = this._on_clicked_request_bound;
  eh.mouseover["select-network-request"] = this._on_hover_request_bound;

  eh.click["select-network-request-graph"] = this._on_clicked_request_bound;
  eh.mouseover["select-network-request-graph"] = this._on_hover_request_graph_bound;

  eh.click["close-request-detail"] = this._on_clicked_close_bound;
  eh.click["get-response-body"] = this._on_clicked_get_body;

  eh.click["toggle-raw-cooked-response"] = this._on_clicked_toggle_response_bound;
  eh.click["toggle-raw-cooked-request"] = this._on_clicked_toggle_request_bound;

  var doc_service = window.services['document-manager'];
  doc_service.addListener("abouttoloaddocument", this._on_abouttoloaddocument_bound);
  doc_service.addListener("documentloaded", this._on_documentloaded_bound);

  var contextmenu = ContextMenu.get_instance();
  contextmenu.register("request-context-options", [
    {
      label: "Show in resource view",
      handler: function(evt, target) {
        var cur = evt.target, rid;
        while (cur)
        {
          if (rid = cur.getAttribute("data-resource-id")) { break }
          cur = cur.parentNode;
        }
        var view = cls.ResourceManagerAllView.get_instance();
        view.show_resource_for_id(rid);
      }
    },
    {
      label: "Copy to resource crafter",
      handler: function(evt, target) {
        var cur = evt.target, rid;
        while (cur)
        {
          if (rid = cur.getAttribute("data-resource-id")) { break }
          cur = cur.parentNode;
        }
      }
    }
  ]);


  new Settings
  (
    // id
    "network_logger",
    // key-value map
    {
      "request-view-mode": "cooked",
      "response-view-mode": "cooked"
    },
    // key-label map
    {

    },
    // settings map
    {
      checkboxes: []
    },
    null,
    null
  );

  this.init(id, name, container_class, html, default_handler);
};
cls.NetworkLogView.prototype = ViewBase;
