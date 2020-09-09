/**
 * @fileoverview Create a customizable console(s).
 * @author Jordan Chesley
 * @version 0.1.0
 */

String.prototype.ljust = function(length) {
  var fill = [];
  while (this.length + fill.length < length) {
    fill[fill.length] = "&nbsp;";
  }
  return this + fill.join("");
}

class custconsole {
  constructor(name = "Custom Console", author = undefined, version = "0.1", selector = undefined) {
    this.name = name;
    this.author = author;
    this.version = version;

    this.header = `${this.name} v[${this.version}]`;
    if (this.author !== undefined) {
      this.header += ` created by ${this.author}.`;
    }
    this.header += "<br/>Type 'help' for a list of commands.<br/>";

    // A "dictionary" of available users to login as on the console.
    this.users = {};
    this.currentUser = null;

    // Acts as a boolean and helps prevent accidental invocations.
    this.logAtt = false;

    this.commands = {};
    this.visible_commands = {};

    this.container = document.createElement("div");
    this.log = document.createElement("p");
    this.input = document.createElement("input");

    this.prompt = "> ";

    // We have an object that can temporarily store information.
    this.cache = {};

    // If a selector was given, assign it's selector as a
    // class and id, since we don't know the user's preference.
    if (selector) {
      this.container.className = selector;
      this.container.id = selector;
    }

    // Without binding 'this', some handlers produce errors. Therefore,
    // the following is necessary.
    this.streamHandler = this.hideStream.bind(this);
    this.cmCloseHandler = this._masterCMCloser.bind(this);

    //this.color = new Color(this.log);

    this.checkOverflow = new MutationObserver(() => {this.correctOverflow()});
    this.checkOverflow.observe(this.log, {subtree: true, childList: true});

    this.cm = new ContextMenu;

    // Build the shell in the webpage.
    this.buildWebDisplay();
  }

  buildWebDisplay() {
    // Container (div) styles.
    this.container.style.backgroundColor = "#000000";
    this.container.style.color = "#FFFFFF";
    this.container.style.width = "815px";
    this.container.style.height = "29em";
    this.container.style.fontFamily = "Consolas";
    this.container.style.fontSize = "14px";

    // Logbox (p) styles and events.
    this.log.style.backgroundColor = "inherit";
    this.log.style.color = "inherit";
    this.log.style.width = "100%";
    this.log.style.maxHeight = "95%";
    this.log.style.lineHeight = "default + 1em";
    this.log.style.fontFamily = "inherit";
    this.log.style.fontSize = "inherit";
    this.log.style.marginTop = "0.2em";
    this.log.style.marginBottom = "0";
    this.log.style.overflow = "auto";

    // Input box (input) styles, attributes, and events.
    this.input.style.backgroundColor = "transparent";
    this.input.style.color = "inherit";
    this.input.style.border = "none";
    this.input.style.outline = "none";
    this.input.style.width = "99%";
    this.input.style.fontFamily = "inherit";
    this.input.style.fontSize = "inherit";
    this.input.style.marginTop = "-0.2em";
    this.input.style.marginLeft = "-0.13em";
    this.input.setAttribute("autocomplete", "off");
    this.input.autofocus = true;
    this.input.spellcheck = false;
    this.input.value = this.prompt;
    this.input.addEventListener("keypress", () => {this._checkKeys(event)}, false);
    this.input.addEventListener("input", () => {this._checkPrompt(event)}, false);

    // Context (right-click) menu.
    this.cm.addSpace();
    this.cmdsub = this.cm.createSubMenu("commands");
    this.cm.item("help", () => {this.invoke("help")});
    this.cm.item("clear", () => {this.clear()});
    this.container.addEventListener("contextmenu", event => {event.preventDefault();this.cm.viewMenu(true, event);}, false);
    window.addEventListener("click", this.cmCloseHandler, false);

    // Append everything; Build shell.
    document.body.appendChild(this.container);
    this.container.appendChild(this.log);
    this.container.appendChild(this.input);

    // Print the console header.
    this.print(this.header);

  }

  print(...string) {
    // Join the array together into a string.
    string = string.join(" ");

    // Print the string and then make a newline "<br/>"
    // (Equivalent to "\n").
    this.log.innerHTML += `${string}<br/>`;
  }

  clear() {
    this.log.innerHTML = "";
  }

  destroy(message) {
    // Hide any context menus that may be open.
    this.cm.viewMenu(false);
    this.cmdsub.viewMenu(false);

    // Remove mutators and events. Remove the shell.
    this.checkOverflow.disconnect();
    window.removeEventListener("click", this.cmCloseHandler, false);
    document.body.removeChild(this.container);

    // Delete all properties.
    for (let property in this) {
      delete this[property];
    }

    // Display a message if given.
    if (message) {
    var notification = document.createElement("p");
    notification.style.textAlign = "center";
    notification.innerHTML = message || "Console has been deleted.";
    document.body.appendChild(notification);
    }
  }

  correctOverflow() {
    // Essentially the following says "scroll to bottom".
    this.log.scrollTop = this.log.scrollHeight;
  }

  setPrompt(string) {
    this.prompt = string;

    // Make sure there is a space between the prompt and the input.
    if (this.prompt.substring(this.prompt.length - 1, this.prompt.length) != " ") {
      this.prompt += " ";
    }
    this.input.value = this.prompt;
  }

  _masterCMCloser() {
    this.cm.viewMenu(false);
  }

  _checkPrompt(event) {
    // Grab the prompt (or the rest of it) from the beginning
    // of the invocation.
    var subprompt = this.input.value.substring(0, this.prompt.length);

    // If the prompt is partially erased we need to replace it.
    if (subprompt != this.prompt) {

      // Grab any text that may have been typed before and save it.
      let invocation = this.input.value.replace(this.input.value.substring(0, this.prompt.length - 1), "");

      // Replace the prompt plus any existing invocation text.
      this.input.value = this.prompt + invocation;

      // If they cleared the invocation and were trying to type
      // a new character, include the character.
      if (invocation == "" && event.data != null) {
        this.input.value += event.data;
      }
    }
  }

  _checkKeys(event) {
    // If the key pressed is 13 (Enter) and the user is not attempting
    // to login, we assume the console user is trying to invoke a command.
    if ((event.keyCode == 13 || event.which == 13) && this.logAtt == false) {
      this.invoke();
    }
    // However if they are attempting to login, then we assume they are
    // passing credentials.
    else if ((event.keyCode == 13 || event.which == 13) && this.logAtt == true) {
      if (this.prompt == "Username: ") {
        this.cache['usercache'] = this.input.value.replace(this.prompt, "");
        this.print(this.input.value);
        this.login(this.cache['usercache']);
      } else if (this.prompt == "Password: ") {
        this.print(this.input.value);
        this.login(this.cache['usercache'], this.cache['pwdcache']);
      }
    }
  }

  hideStream(event) {
    // If text is being added...
    if (event.inputType == "insertText") {
      // Save it into the password cache.
      this.cache['pwdcache'] += event.data;
    // If text is being deleted...
    } else if (event.inputType == "deleteContentBackward") {
      // Remove the last character in the string.
      this.cache['pwdcache'] = this.cache['pwdcache'].substring(0, this.cache['pwdcache'].length - 1);
    }

    // Reset the prompt.
    this.setPrompt("Password: ");
  }

  clearCache() {
    // Clear the this.cache object.
    this.cache = {};
  }

  login(username = undefined, password = undefined) {
    if (!(cc.currentUser)) {
      if (!(this.logAtt)) {
        this.logAtt = true;
        this.cache['promptcache'] = this.prompt;
      }
      try {
        // If no username is passed, request it.
        if (!(username)) {
          this.setPrompt("Username: ");
          return;
        }
        // If no password is passed, request it.
        if(!(password)) {
          this.setPrompt("Password: ");
  
          // Don't show the password input.
          this.input.addEventListener("input", this.streamHandler, false);
          this.cache['pwdcache'] = "";
          return;
        }
        // If this listener exists, remove it.
        this.input.removeEventListener("input", this.streamHandler, false);
  
        for (let user in this.users) {
          // If the user exists...
          if (user == username) {
  
            // If the passwords don't match...
            if (!(password == this.users[user])) {
              this.print("Incorrect credentials.<br/>");
              this.login();
              return;
  
            // If the passwords do match...
            } else if (password == this.users[user]) {
              this.currentUser = username;
              this.print(`Logged in as ${this.currentUser}.<br/>`);
  
              // Reset all.
              this.logAtt = false;
              this.setPrompt(this.cache['promptcache']);
              this.invoke(this.cache['lastcall'], true);
              this.clearCache();
              return;
            // If something else occurs.
            } else {
              this.print("Error occurred. Re-enter password.<br/>");
              this.login(username);
              return;
            }
          }
        }
        // If we reach this point then given user does not exist.
        this.print("Incorrect credentials.<br/>");
        this.cache['pwdcache'] = undefined;
        this.login();
      }
      catch {
        // If an error occurred, just revert everything.
        this.print("Error occurred. Exiting login module.<br/>");
        this.logAtt = false;
        this.setPrompt(this.cache['promptcache']);
        this.clearCache();
      }
    }
  }

  logout() {
    if (this.currentUser) {
      this.print(`Logged out of ${this.currentUser}.`);
      this.currentUser = null;
    } else {
      this.print("No user logged in.");
    }
  }

  invoke(commandString, recall = false) {
    try {
      // Don't any other input to process.
      this.input.disabled = true;

      // We allow for custconsole.invoke() to be called in the browser
      // console. If it's not called there (or called without input),
      // we hen assume it was called by th event handler, which
      // automatically does not pass input.
      if (!(commandString)) {
        var commandString = this.input.value.replace(this.prompt, "");
      }

      // Remove text from the input element.
      this.input.value = "";

      // Recall the command inside the console log.
      if (!(recall)) {
        this.print(`${this.prompt}${commandString}`);
      }

      // Only attempt to parse if an invocation exists.
      if (!(commandString == "")) {
        var [command, args] = this.parse(commandString);
        this.cache['lastcall'] = command;

        // If 'help' is called, check to see if a custom help command
        // exists. If not, use the built-in one.
        if (command == 'help') {
          if (!('help' in this.commands)) {
            let help = new Help(this.log, this.visible_commands);
            help = undefined;
            return;
          }
        }
        
        // If the command does not exist, out an error to the console.
        if (!(command in this.commands)) {
          throw new Error(`'${command}' is not a command. Type 'help' for a list of commands.`);
        }

        // Grab the command and call it.
        command = this.commands[command];
        command.callback(...args);
      }
    }
    catch (err) {
      this.print(err.message);
    }
    finally {
      // If custconsole.invoke() was called but no invocation
      // existed, output that it was at least called.
      if (this.log) {
        if(commandString != "") {
        this.print("");
        }

        // Reset the input element.
        this.input.value = this.prompt;
        this.input.disabled = false;
        this.input.focus();
      }
    }
  }

  parse(string) {
    var args = [];

    // If arguments don't exist, don't bother.
    if (!(string.split(" ", 2).length > 1)) {
      return [string, args];
    } else {

      // Split the command and the arguments, storing
      // the command in a separate variable.
      var cmd = string.split(" ", 1).toString();
      string = string.replace(cmd + " ", "");

      // Add an extra space to make parsing easier.
      string += " ";

      var start = 0;
      var end = 0;

      // Run the following until the invocation string is empty.
      while (!(string == "")) {

        for (let x = 0; x < string.length; x++) {
          var char = string.charAt(x);
          
          // A ' or " signals a character string. We find the other
          // character and save the string in between in an array.
          if (char == "\'" || char == "\"") {
            start = string.indexOf(char);
            if (!(string.substring(start + 1).indexOf(char) == -1)) {
              end = string.substring(start + 1).indexOf(char) + 2;
              console.log(end);
              args.push(string.substring(start, end));
              string = string.replace(string.substring(start, end), "");
              if (string.substring(0, 1) == " ") {
                string = string.replace(" ", "");
              }
            } else {
              string = string.replace(char, "");
            }
            break;
          }

          // A " " signals we've passed over an argument (or arg). We go
          // back, retrieve the value, and save it in an array.
          else if (char == " ") {
            end = string.indexOf(char);
            if (string.substring(0, end) != " ") {
              args.push(string.substring(0, end));
            }
            string = string.replace(string.substring(0, end + 1), "");
            break;
          }
        }
      }
      return [cmd, args];
    }
  }

  alphabetizeCommands() {
    var orderedList = {};
    for (let x of [this.commands, this.visible_commands]) {
      orderedList = {};
      for (let key of Object.keys(x).sort()) {
        orderedList[key] = x[key];
      }
      x = orderedList;
    }
  }

  command(target, ...args) {
    try {
      // Create the command by passing the function
      // and any optional arguments.
      var command = new Command(target, ...args);
      name = args[0] || target.name;

      // If it already exists, throw an error.
      if (name in this.commands) {
        throw new Error(`Command '${command.name}' is defined more than once. using first definition.<br/>`);
      }

      // Save the command inside the internal command
      // dictionary (object).
      this.commands[command.name] = command;

      // If the user doesn't want the command hidden, add it
      // to the visible commands dictionary (object).
      if (!(args[2])) {
        this.visible_commands[command.name] = command;
        this.cmdsub.item(command.name, () => {this.invoke(command.name)});
      }
      this.alphabetizeCommands();
    }
    catch (err) {
      this.print(err.message);
    }
    finally {
      // If the program succeeds and "command" is an
      // object, return it. If not, return nothing.
      if (typeof command == 'object') {
        return command;
      } else {
        return;
      }
    }
  }
}

class Command {
  constructor(func, ...args) {
    this.name = args[0] || func.name;
    this.callback = func;
    this.description = args[1] || "No description provided.";
  }
}

class Help {
  constructor(log, commands) {
    //log.innerHTML += "<br/>";
    if (Object.keys(commands).length != 0) {
      for (let command in commands) {
        command = commands[command];
        let name = command.name.ljust(20);
        let description = command.description;
        log.innerHTML += `${name} ${description}<br/>`;
      }
    } else {
      log.innerHTML += "No commands defined<br/>";
    }
  }
}

class ContextMenu {
  constructor() {
    this.body = document.createElement("div");
    this.buildBody();
  }

  buildBody() {
    // Add styles and append.
    this.body.style.cssText = "background-color:white;border: 1px solid #cccccc;box-shadow: 1px 1px 10px rgb(0, 0, 0, 0.1);padding: 10px 0;width: 150px;position: absolute;top: 0;left: 0;display:none;";
    document.body.append(this.body);

    // Add these these required items.
    this.item("Copy", () => {var text=window.getSelection().toString;navigator.clipboard.writeText(text);});
  }

  viewMenu(show = true, event) {
    if (show) {
      // Set the location coordinates and change the display style.
      this.setPosition(event);
      this.body.style.display = "block";
    } else {
      // Hide the container.
      this.body.style.display = "none";
    }
  }

  setPosition(event) {
    // Set coordinates to mouse location.
    this.body.style.top = event.y + "px";
    this.body.style.left = event.x + "px";
  }

  addSpace() {
    // Create an <hr/> element, style it, and append it.
    var spacer = document.createElement("hr");
    spacer.style.cssText = "width:130px;color:black;";
    this.body.appendChild(spacer);
  }

  item(text, callback) {
    // Make sure at least the first letter is capitalized.
    if (text.substring(0, 1) != text.substring(0, 1).toUpperCase()) {
      text = text.substring(0, 1).toUpperCase() + text.substring(1, text.length);
    }
    // Create a <div> element and style it.
    var item = document.createElement("div");
    item.style.cssText = "cursor:pointer;padding:4px 10px;position:relative;";

    // Set the text.
    item.innerHTML = text;
    
    // If there's a callback function, add a click listener to it.
    if (callback) {
      item.addEventListener("click", callback, false);
    }
    
    // Add these no matter what. This adds hover styles to the items.
    item.addEventListener("mouseover", () => {item.style.backgroundColor="#777777f8";item.style.color="white";}, false);
    item.addEventListener("mouseout", () => {item.style.backgroundColor="transparent";item.style.color="black";}, false);

    // Append and return.
    this.body.appendChild(item);
    return item;
  }

  createSubMenu(name) {
    var body = this.item(name);
    var submenu = new SubMenu(body);
    var span = document.createElement("span");
    span.style.cssText = "float:right;";
    span.innerHTML = ">";
    body.appendChild(span);
    return submenu;
  }
}

// This is a ContextMenu class, but with slightly modified methods.
class SubMenu {
  constructor(parent) {
    // SubMenu.parent is the item in which will show the this menu.
    this.parent = parent;
    this.body = document.createElement("div");
    this.buildBody();
  }

  buildBody() {
    // Add styles and append.
    this.body.style.cssText = "background-color:white;border: 1px solid #cccccc;box-shadow: 1px 1px 10px rgb(0, 0, 0, 0.1);padding: 10px 0;width: 150px;position: absolute;top: 0;left: 0;display:none;";
    document.body.appendChild(this.body);

    // Add some event listeners that handle when the menu is seen.
    // We attach these to this menu, the parent item, and the window.
    this.parent.addEventListener("mouseover", () => {this.viewMenu(true)}, false);
    this.parent.addEventListener("mouseout", () => {this.viewMenu(false)}, false);
    window.addEventListener("click", () => {this.viewMenu(false)}, false);
    this.body.addEventListener("mouseover", () => {this.viewMenu(true)}, false);
    this.body.addEventListener("mouseout", () => {this.viewMenu(false)}, false);
  }

  viewMenu(show) {
    if (show) {
      // Set the location coordinates and change the display style.
      this.setPosition(event);
      this.body.style.display = "block";
    } else {
      // Hide the container.
      this.body.style.display = "none";
    }
  }

  setPosition() {
    // Set coordinates so that menu is next to parent.
    this.body.style.top = this.parent.getBoundingClientRect().top + "px";
    this.body.style.left = this.parent.getBoundingClientRect().left + 150 + "px";
  }

  addSpace() {
    // Create an <hr/> element, style it, and append it.
    var spacer = document.createElement("hr");
    spacer.style.cssText = "width:130px;color:black;";
    this.body.appendChild(spacer);
  }

  item(text, callback) {
    // Make sure at least the first letter is capitalized.
    if (text.substring(0, 1) != text.substring(0, 1).toUpperCase()) {
      text = text.substring(0, 1).toUpperCase() + text.substring(1, text.length);
    }
    // Create a <div> element and style it.
    var item = document.createElement("div");
    item.style.cssText = "cursor:pointer;padding:4px 10px;position:relative;";

    // Set the text.
    item.innerHTML = text;
    
    // If there's a callback function, add a click listener to it.
    if (callback) {
      item.addEventListener("click", callback, false);
    }
    // Add these no matter what. This adds hover styles to the items.
    item.addEventListener("mouseover", () => {item.style.backgroundColor="#777777f8";item.style.color="white";}, false);
    item.addEventListener("mouseout", () => {item.style.backgroundColor="transparent";item.style.color="black";}, false);

    // Append and return.
    this.body.appendChild(item);
    return item;
  }
}
