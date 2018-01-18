/* GLOBALS */

var scale = 3;

//Scenery & Objects
var ship = {
	sprite: null,
	posX: 28,
	posY: 48,
	day: 1,
	fuel: 50,
	crew: 129,
	happiness: 100,
	hull: 100,
    needsRecharge: false,
    fname_Pilot: "Sasha",
    sname_Pilot: "Walker",
    fname_Engineer: "Frank",
    sname_Engineer: "Nemo",
    fname_Navigator: "Nasir",
    sname_Navigator: "Magellan",
    fname_Security: "Danai",
    sname_Security: "Michaels",
	
	reachedDestination: false,
    
    //Parse a JSON object to change some ship data.
    effectChange: function(effect) {
        /*
        The possible effects are:
        resource_fuel +-
        resource_crew +-
        resource_happiness +-
        resource_hull +=
        */
        
        if (effect.resource_fuel != null) {
            ship.fuel += effect.resource_fuel;
			
			if (ship.fuel <= 0) {
				playState.lose();
			}
        }
        if (effect.resource_crew != null) {
            ship.crew += effect.resource_crew;
			
			if (ship.crew <= 0) {
				playState.lose();
			}
        }
        if (effect.resource_happiness != null) {
            ship.happiness += effect.resource_happiness;
			
			if (ship.happiness <= 0) {
				playState.lose();
			}
        }
        if (effect.resource_hull != null) {
            ship.hull += effect.resource_hull;
			
			if (ship.hull <= 0) {
				playState.lose();
			}
        }
    }
};

var bg = {
	sprite0: null,
	sprite1: null,
	posX: 0
};

var groupBackground;
var groupPlanets;
var groupShip;

//UI
var statusBar = {
	bgSprite: null
};
var messageBox = {
	title: "MESSAGETITLE",
	content: "MESSAGECONTENT",
	options: null
};
var slickUI;

var playState = {
    
    //State Information
	
	preload: function() {
		groupBackground = game.add.group();
		groupPlanets = game.add.group();
        groupShip = game.add.group();
		
		//Slick UI library
		slickUI = game.plugins.add(Phaser.Plugin.SlickUI);
		slickUI.load('res/ui/kenney/kenney.json');
		
		//Data
		game.load.json("data_encounters", "res/data/data_encounters.json");
	},

	create: function () {
		
		//Initialise scenery & objects
		bg.sprite0 = groupBackground.create(bg.posX, 0, 'bg_starField');
		bg.sprite1 = groupBackground.create(bg.posX + bg.sprite0.width, 0, 'bg_starField');
		
        ship.sprite = groupShip.create(ship.posX, ship.posY, 'img_ship');
        
		for (var i = 0; i < 5; i++) {
			groupPlanets.create(15 + i*50, Math.random() * 150, 'img_planet');
		}
		
        groupPlanets.scale.set(scale);
        groupBackground.scale.set(scale);
        groupShip.scale.set(scale);
		
        this.initUI();
        
        console.log(mapData);
        var systemObject = mapData.systems[mapData.shipPosition];
        
		if (systemObject.isDestination) {
			playState.win();
		}
        
        var currentDanger = undefined;
        
		if (systemObject.danger !== null) {
			currentDanger = systemObject.danger;
		}
        
        if (ship.day > 1) {
            
            //TODO: if we've just landed in a system with a danger, fire a danger event
            
            if (ship.needsRecharge) {
                //The ship just jumped and needs to recharge. Display some system welcome text, and maybe a danger event.
                if (currentDanger !== undefined) {
                    this.fireEvent_Danger(currentDanger);
                }
                
            } else {
                //The ship just spent a night recharging its jump drive. We haven't changed systems - fire a story event.
                this.fireEvent_Story();
            }
        }
	},
	
	update: function() {
		this.scrollBackground();
        
        if (ship.happiness > 100) {
            ship.happiness = 100;
        }
	},
	
	render: function() {
		
	},
	
	/* SCENERY MANAGEMENT */
	
	scrollBackground: function() {
		
		var backgroundMovement = 0.001 * game.time.elapsed * scale;
		
		bg.posX -= backgroundMovement;
		
		if (bg.posX < 0 - bg.sprite0.width)
			bg.posX = 0;
		
		bg.sprite0.x = bg.posX;
		bg.sprite1.x = bg.posX + bg.sprite0.width;
		
		groupPlanets.x -= backgroundMovement * 45;
		
		if (groupPlanets.x < - 250 * scale)
			groupPlanets.x = 250 * scale;
	},
	
	/* UI MANAGEMENT */
    
    displayMessage: function(title, content, options) {
		
		messageBox.title = title;
        messageBox.content = content;
		messageBox.options = options;
        
        this.createMessageBox();
    },
    
    displayMessageNoChoice: function(title, content) {
        
		var continueJourney = [{choice: "Continue the journey", diceRoll: false, final: true}];
        
        messageBox.title = title;
        messageBox.content = content;
		messageBox.options = continueJourney;
        
        this.createMessageBox();
    },
    
    createMessageBox: function() {
		
		//Set bounds and instantiate panel
        var x = 84 * scale;
        var y = 7 * scale;
        var panel;
        slickUI.add(panel = new SlickUI.Element.Panel(x, y, 164 * scale, 84 * scale));
		
        messageBox.content = playState.swapNames(messageBox.content);
        
		//Add title and content
        panel.add(new SlickUI.Element.Text(2 * scale, 0, messageBox.title)).centerHorizontally();
        panel.add(new SlickUI.Element.Text(2 * scale, 12 * scale, messageBox.content));
        
		//Add buttons
		for (var i = 0; i < messageBox.options.length; i++) {
			var button;
			var option = messageBox.options[i];
			
            if (messageBox.options.length == 1) {
                panel.add(button = new SlickUI.Element.Button(0, 50 * scale + i * 14 * scale + 50, 164 * scale, 14 * scale));
            } else {
                panel.add(button = new SlickUI.Element.Button(0, 50 * scale + i * 14 * scale, 164 * scale, 14 * scale));
            }
			button.add(new SlickUI.Element.Text(0,0, option.choice)).center();
			
			//Make the buttons do different stuff depending on what the JSON data says.
			
			if (option.diceRoll) {
				
				//Save the option for use in the callback later.
				var selectedOption = option;
				
				button.events.onInputUp.add(function () {
					//This event requires a roll of the dice to see the outcome.
					//We grab the probability and the win/lose responses from the JSON data.
					
					var response = "Response not set!";
                    var effect = "Effect not set!";
					var effectText = "";
					
					if (Math.random() < selectedOption.winChance) {
						//win! :)
						response = selectedOption.win.response;
						effect = selectedOption.win.effect;
						
						effectText = JSON.stringify(effect);
						effectText = effectText.substr(effectText.indexOf('_')+1);
						effectText = effectText.replace('":',": ");
						effectText = effectText.replace('}',"");
						
						if (effectText.includes(',')) {
							var effectText2 = effectText.substr(effectText.indexOf(',')+1);
							effectText = effectText.substr(0,effectText.indexOf(','));
							effectText2 = effectText2.substr(effectText2.indexOf('_')+1);
							effectText2 = effectText2.replace('":',": ");
							effectText2 = effectText2.replace('}',"");
							
							effectText += "\n" + effectText2;
						}
						
						response += "\n\n" + effectText;
						
                        ship.effectChange(effect);
						
					} else {
						//fail! :(
						response = selectedOption.fail.response;
						effect = selectedOption.fail.effect;
						
						effectText = JSON.stringify(effect);
						effectText = effectText.substr(effectText.indexOf('_')+1);
						effectText = effectText.replace('":',": ");
						effectText = effectText.replace('}',"");
						
						if (effectText.includes(',')) {
							var effectText2 = effectText.substr(effectText.indexOf(',')+1);
							effectText = effectText.substr(0,effectText.indexOf(','));
							effectText2 = effectText2.substr(effectText2.indexOf('_')+1);
							effectText2 = effectText2.replace('":',": ");
							effectText2 = effectText2.replace('}',"");
							effectText += "\n" + effectText2;
						}
						
						response += "\n\n" + effectText;
						
                        ship.effectChange(effect);
					}
					
					panel.destroy();
                    
                    response = playState.swapNames(response);
                    
					playState.displayMessageNoChoice(messageBox.title, response);
                    
                    //Update the UI with the changes
                    playState.initUI();
				});
				
			} else {
				
				button.events.onInputUp.add(function () {
					
					//There's no dice roll needed here. 
					
					panel.destroy();
					
					if (!option.final) {
						//option.final is just a flag to note whether this is the last dialog box in a sequence.
						playState.displayMessageNoChoice(messageBox.title, option.response);
					}
                    
                    //Update the UI with the changes
                    playState.initUI();
                    
				});
			}
		}
    },
	
	/* TESTING FOR THE JSON INTERPRETER */
	
	JSONtest: function() {
		data_encounters = game.cache.getJSON('data_encounters');
		console.log(data_encounters);
	},
    
    /* Events loaded from JSON data */
    
    fireEvent_Danger: function(danger) {
        
		console.log("Firing danger event " + danger);
        ship.needsRecharge = true;
        
        //Danger events are system-dependent, so pull the event from a JSON file,
        //looking it up by the tag attached to the mapData object. E.g. "danger": "ASTEROIDS" or "danger": "MILITARY"
        //Actually, thinking about it, the danger events could be procedurally generated while the story events are written.
        
        //Danger events, when complete, require you to recharge your jump drive before you can jump again.
        //Recharging should play a visual effect (like jumping does - or will, rather) and then fire a story event.
    },
    
    fireEvent_Story: function() {
		
		data_encounters = game.cache.getJSON('data_encounters');
		
		var selector = Math.floor(Math.random() * data_encounters.length);
		
		var encounter = data_encounters[selector];
		
		console.log("Firing story event: " + encounter.name);
		
		this.displayMessage(encounter.title, encounter.content, encounter.options);
        
        //Story events, when complete, allow you to jump to another system.
    },
    
    recharge: function() {
        ship.needsRecharge = false;
        playState.fireEvent_Story();
    },
    
    swapNames: function(text) {
        
        //Swap out the nametags in a string with the player-set character names (or defaults)
        //Positions are in the format FNAME_JOBTITLE and SNAME_JOBTITLE
        //Jobtitles are PILOT, NAVIGATOR, ENGINEER, SECURITY
        
        var result = text;
        
        result = result.replace("[FNAME_PILOT]", ship.fname_Pilot);
        result = result.replace("[SNAME_PILOT]", ship.sname_Pilot);
        result = result.replace("[FNAME_ENGINEER]", ship.fname_Engineer);
        result = result.replace("[SNAME_ENGINEER]", ship.sname_Engineer);
        result = result.replace("[FNAME_NAVIGATOR]", ship.fname_Navigator);
        result = result.replace("[SNAME_NAVIGATOR]", ship.sname_Navigator);
        result = result.replace("[FNAME_SECURITY]", ship.fname_Security);
        result = result.replace("[SNAME_SECURITY]", ship.sname_Security);
        
        return result;
    },
    
    initUI: function() {
        
        var statusPanel;
        var barX = 0;
        var barY = 99 * scale;
        slickUI.add(statusPanel = new SlickUI.Element.Panel(barX, barY, game.width, game.height));
        
        statusPanel.add(new SlickUI.Element.Text(4 * scale, 2 * scale, "DAY " + ship.day));
        
        var mapButton = statusPanel.add(new SlickUI.Element.Button(2 * scale, 12 * scale, 24 * scale, 10 * scale));
		mapButton.add(new SlickUI.Element.Text(0, 0, "Map")).center();
        mapButton.events.onInputUp.add(function () {game.state.start('map');});
        
        var rechargeButton = statusPanel.add(new SlickUI.Element.Button(31 * scale, 12 * scale, 84 * scale, 10 * scale));
		rechargeButton.add(new SlickUI.Element.Text(0, 0, "Recharge Jump Drive")).center();
        rechargeButton.events.onInputUp.add(this.recharge);
        
        statusPanel.add(new SlickUI.Element.Text(32 * scale, 2 * scale, "Fuel reserves: " + ship.fuel + " kilotonnes"));
        //statusPanel.add(new SlickUI.Element.Text(32 * scale, 12 * scale, "Crew complement: " + ship.crew));
        statusPanel.add(new SlickUI.Element.Text(164 * scale, 2 * scale, "Happiness index: " + ship.happiness + "%"));
        statusPanel.add(new SlickUI.Element.Text(164 * scale, 12 * scale, "Hull integrity: " + ship.hull + "%"));
    },
	
	win: function() {
		console.log("WIN");
	},
	
	lose: function() {
		console.log("LOSE");
	}
	
};