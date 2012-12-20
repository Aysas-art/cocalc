###########################################
#
# An Xterm Console Window
#
###########################################

{EventEmitter} = require('events')
{alert_message} = require('alerts')
{copy, filename_extension, required, defaults, to_json} = require('misc')

templates        = $("#salvus-console-templates")
console_template = templates.find(".salvus-console")

feature = require 'feature'
IS_ANDROID = feature.isMobile.Android()
IS_MOBILE = feature.IS_MOBILE

codemirror_renderer = (start, end) ->
    terminal = @
    if terminal.editor?
        width = terminal.cols
        e = terminal.editor

        # Set the output text
        y = start
        out = ''
        while y <= end
            row = y + terminal.ydisp
            ln = this.lines[row]
            out += (ln[i][1] for i in [0...width]).join('') + '\n'
            y++
        e.replaceRange(out, {line:start+terminal.ydisp,ch:0}, {line:end+1+terminal.ydisp,ch:0})

        # Render the cursor
        cp1 = {line:terminal.y+terminal.ydisp, ch:terminal.x}
        cp2 = {line:cp1.line, ch:cp1.ch+1}
        if e.getRange(cp1, cp2).length == 0
            e.replaceRange(" ", cp1, cp2)
        if terminal.salvus_console.is_focused
            e.markText(cp1, cp2, {className:'salvus-console-cursor-focus'})
        else
            e.markText(cp1, cp2, {className:'salvus-console-cursor-blur'})
        e.scrollIntoView(cp1)

        # showing an image
        #e.addLineWidget(end+terminal.ydisp, $("<img width=50 src='http://vertramp.org/2012-10-12b.png'>")[0])


class Console extends EventEmitter
    constructor: (opts={}) ->
        @opts = defaults opts,
            element     : required  # DOM (or jQuery) element that is replaced by this console.
            session     : required   # a console_session
            title       : ""
            rows        : 24
            cols        : 80
            highlight_mode : 'none'
            renderer    : 'codemirror'   # options -- 'codemirror' (syntax highlighting, better mobile support), 'ttyjs' (color)
            draggable   : false

        @opts.renderer = 'ttyjs'
        #@opts.renderer = 'codemirror'

        # The is_focused variable keeps track of whether or not the
        # editor is focused.  This impacts the cursor, at least.
        @is_focused = false

        # Create the DOM element that realizes this console, from an HTML template.
        @element = console_template.clone()

        # Record on the DOM element a reference to the console
        # instance, which is useful for client code.
        @element.data("console", @)

        # Actually put the DOM element into the (likely visible) DOM
        # in the place specified by the client.
        $(@opts.element).replaceWith(@element)

        # Set the initial title, though of course the term can change
        # this via certain escape codes.
        @set_title(@opts.title)

        # Create the new Terminal object -- this is defined in
        # static/term.js -- it's a nearly complete implemenation of
        # the xterm protocol.
        @terminal = new Terminal(@opts.cols, @opts.rows)
        # this is needed by the custom renderer, if it is used.
        @terminal.salvus_console = @

        that = @

        # Select the renderer
        switch @opts.renderer
            when 'codemirror'
                # NOTE: the codemirror renderer depends on the xterm one being defined...
                @_init_ttyjs()
                $(@terminal.element).hide()
                @_init_codemirror()
            when 'ttyjs'
                @_init_ttyjs()
                $(@terminal.element).show()
            else
                throw("Unknown renderer '#{@opts.renderer}'")

        # delete scroll buttons except on mobile
        if not IS_MOBILE
            @element.find(".salvus-console-up").hide()
            @element.find(".salvus-console-down").hide()

        # Store the remote session, which is a connection to a HUB
        # that is in turn connected to a console_server.
        @session = opts.session

        # Plug the remote session into the terminal.

        # The user types in the terminal, so we send the text to the remote server:
        @terminal.on 'data',  (data) => @session.write_data(data)

        # The terminal receives a 'set my title' message.
        @terminal.on 'title', (title) => @set_title(title)

        # The remote server sends data back to us to display:
        @session.on 'data',  (data) => @terminal.write(data)


        #########################

        # Start the countdown timer, which shows how long this session will last.
        @_start_session_timer(opts.session.limits.walltime)

        # Set the entire console to be draggable.
        if @opts.draggable
            @element.draggable(handle:@element.find('.salvus-console-title'))

        @blur()


    #######################################################################
    # Private Methods
    #######################################################################
    _init_codemirror: () ->
        that = @
        @terminal.custom_renderer = codemirror_renderer
        t = @element.find(".salvus-console-textarea")
        editor = @terminal.editor = CodeMirror.fromTextArea t[0],
            lineNumbers   : false
            lineWrapping  : false
            indentUnit    : 0  # seems to have no impact (not what I want...)
            mode          : @opts.highlight_mode   # to turn off, can just use non-existent mode name

        e = $(editor.getScrollerElement())
        e.css('height', "#{@opts.rows+0.4}em")
        e.css('background', '#fff')

        editor.on('focus', that.focus)
        editor.on('blur', that.blur)

        # Hide codemirror's own cursor.
        $(editor.getScrollerElement()).find('.CodeMirror-cursor').css('border', '0px')

        # Hacks to workaround the "insane" way in which Android Chrome
        # doesn't work:
        # http://code.google.com/p/chromium/issues/detail?id=118639
        if IS_ANDROID
            handle_android_change = (ed, changeObj) ->
                s = changeObj.text.join('\n')
                if changeObj.origin == 'input' and s.length > 0
                    that.session.write_data(s)
                    # relaceRange causes a hang if you type "ls[backspace]" right on load.
                    # Thus we use markText instead.
                    #ed.replaceRange("", changeObj.from, {line:changeObj.to.line, ch:changeObj.to.ch+1})
                    ed.markText(changeObj.from, {line:changeObj.to.line, ch:changeObj.to.ch+1}, className:"hide")
                if changeObj.next?
                    handle_android_change(ed, changeObj.next)
            editor.on('change', handle_android_change)

        # Buttons
        if IS_MOBILE
            @element.find(".salvus-console-up").click () ->
                vp = editor.getViewport()
                editor.scrollIntoView({line:vp.from - 1, ch:0})

            @element.find(".salvus-console-down").click () ->
                vp = editor.getViewport()
                editor.scrollIntoView({line:vp.to, ch:0})

    _init_ttyjs: () ->
        # Create the terminal DOM objects -- only needed for this renderer
        @terminal.open()
        # Give it our style; there is one in term.js (upstream), but it is named in a too-generic way.
        @terminal.element.className = "salvus-console-terminal"
        @element.find(".salvus-console-terminal").replaceWith(@terminal.element)

    _start_session_timer: (seconds) ->
        t = new Date()
        t.setTime(t.getTime() + seconds*1000)
        @element.find(".salvus-console-countdown").show().countdown('destroy').countdown
            until      : t
            compact    : true
            layout     : '{hnn}{sep}{mnn}{sep}{snn}'
            expiryText : "Console session killed (after #{seconds} seconds)"
            onExpiry   : () ->
                alert_message(type:"info", message:"Console session killed (after #{seconds} seconds).")

    #######################################################################
    # Public API
    # Unless otherwise stated, these methods can be chained.
    #######################################################################

    blur : () =>
        @is_focused = false
        @terminal.blur()
        editor = @terminal.editor
        if editor?
            e = $(editor.getWrapperElement())
            e.removeClass('salvus-console-focus').addClass('salvus-console-blur')
            e.find(".salvus-console-cursor-focus").removeClass("salvus-console-cursor-focus").addClass("salvus-console-cursor-blur")

    focus : () =>
        @is_focused = true
        @terminal.focus()
        editor = @terminal.editor
        if editor?
            e = $(editor.getWrapperElement())
            e.addClass('salvus-console-focus').removeClass('salvus-console-blur')
            e.find(".salvus-console-cursor-blur").removeClass("salvus-console-cursor-blur").addClass("salvus-console-cursor-focus")

    set_title: (title) ->
        @element.find(".salvus-console-title").text(title)


exports.Console = Console

$.fn.extend
    salvus_console: (opts={}) ->
        @each () ->
            opts0 = copy(opts)
            opts0.element = this
            $(this).data('console', new Console(opts0))
