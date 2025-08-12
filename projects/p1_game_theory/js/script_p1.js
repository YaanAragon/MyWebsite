
console.log('Part 1 console message start');
document.body.insertAdjacentHTML('beforeend', '<p>Part 1 Cooperators vs Defectors </p>');

// script_p1.js

var c = 1;
var b = 4;

var population = [];
var population_size = 100;
var number_of_time_steps = 1000;
var mutation_rate = 0.001;

var strategies = ["ALL_C","ALL_D"];
var data = [];

function Individual(strategy, payoff) {
    this.strategy = strategy;
    this.payoff = payoff;
    this.compute_move = function() {
        return this.strategy == "ALL_C" ? "C" : "D";
    };
    this.add_to_payoff = function(game_payoff) {
        this.payoff += game_payoff;
    };
    this.mutate = function() {
      if (this.strategy == "ALL_C") {
        this.strategy = "ALL_D";
      }
      else {
        this.strategy = "ALL_C";
      }
    };
}

function play_game(individual1, individual2) {
    var move_individual1 = individual1.compute_move();
    var move_individual2 = individual2.compute_move();
    if (move_individual1 == "C") {
        if (move_individual2 == "C") {
            individual1.add_to_payoff(b - c);
            individual2.add_to_payoff(b - c);
        }
        else {
            individual1.add_to_payoff(-c);
            individual2.add_to_payoff(b);
        }
    }
    else {
        if (move_individual2 == "C") {
            individual1.add_to_payoff(b);
            individual2.add_to_payoff(-c);
        }
    }
}

function init_simulation() {
    for (var i = 0; i < population_size; i++) {
        population.push(new Individual("ALL_C",0));
    }
    for (i = 0; i < strategies.length; i++) {
      data.push([]);
    }
}

function run_time_step() {
    games();
    selection();
    mutation();
    for (i = 0; i < strategies.length; i++) {
      data[i].push(get_number_with_strategy(strategies[i]) / population_size);
    }
}

function games() {
    for (var i = 0; i < population_size; i++) {
        var current_individual = population[i];
        var other_individual = get_other_individual(current_individual);
        play_game(current_individual, other_individual);
    }
}

function selection() {
    var temp_population = [];
    for (var i = 0; i < population_size; i++) {
      var current_individual = population[i];
      var other_individual = get_other_individual(current_individual);
      if (other_individual.payoff > current_individual.payoff) {
        temp_population[i] = other_individual;
      }
      else {
        temp_population[i] = current_individual;
      }
    }
    for (i = 0; i < population_size; i++) {
      current_individual = population[i];
      current_individual.strategy = temp_population[i].strategy;
      current_individual.payoff = 0;
    }
}

function mutation() {
    for (var i = 0; i < population_size; i++) {
      if (Math.random() < mutation_rate) {
        var current_individual = population[i];
        current_individual.mutate();
      }
    }
}

function get_other_individual(individual) {
    do {
      var random_index = get_random_int(0,population_size-1);
      var other_individual = population[random_index];
    }
    while (other_individual == individual);
    return other_individual;
}

function get_number_with_strategy(strategy) {
    var count = 0;
    for (var i = 0; i < population_size; i++) {
      if (population[i].strategy == strategy) {
        count++;
      }
    }
    return count;
}

function get_random_int(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function run_simulation() {
    init_simulation();
    for (var i = 0; i < number_of_time_steps; i++) {
        run_time_step();
    }
}

run_simulation();

for (var i = 0; i < number_of_time_steps; i++) {
    console.log(i,"ALL_C",data[0][i],"ALL_D",data[1][i]);
}

console.log("po size, mutation rate, steps:", population_size, mutation_rate, number_of_time_steps)
console.log('Part 1 console message end');

draw_line_chart(data,"time step","frequency",[]);	

