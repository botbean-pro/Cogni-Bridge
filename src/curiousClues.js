const question = (prompt, hint, options, answer) => ({ prompt, hint, options, answer });

// Original, low-pressure puzzles arranged from warm-ups to trickier patterns.
export const curiousClueLevels = [
  { title: "Warm-up Meadow", questions: [
    question("Which number comes next? 2, 4, 6, …", "The numbers grow by two each time.", ["7", "8", "10"], "8"),
    question("Which one does not belong in the garden?", "Two of these can grow outdoors.", ["Flower", "Leaf", "Balloon"], "Balloon"),
    question("Which shape has three corners?", "Count the points on each shape.", ["Circle", "Triangle", "Square"], "Triangle"),
  ] },
  { title: "Pattern Park", questions: [
    question("What comes next? Red, blue, red, blue, …", "The colors take turns.", ["Red", "Green", "Yellow"], "Red"),
    question("Which number is missing? 5, 10, 15, …", "Count forward in fives.", ["18", "20", "25"], "20"),
    question("Which can float in the sky?", "Think of something lighter than air that catches the wind.", ["Paper boat", "Kite", "Pebble"], "Kite"),
  ] },
  { title: "Number Trail", questions: [
    question("What comes next? 1, 2, 3, …", "Count one step at a time.", ["4", "5", "6"], "4"),
    question("Follow the countdown: 10, 9, 8, …", "Each number is one less.", ["6", "7", "9"], "7"),
    question("How many legs does one bird usually have?", "Think of a bird standing on the ground.", ["2", "4", "6"], "2"),
  ] },
  { title: "Look Closely", questions: [
    question("Which is not a shape?", "Look for the word that names food.", ["Square", "Circle", "Carrot"], "Carrot"),
    question("Which shape has four equal sides?", "Its sides are all the same length.", ["Triangle", "Square", "Oval"], "Square"),
    question("Which one do you wear on your feet?", "You usually wear a pair.", ["Sock", "Cup", "Book"], "Sock"),
  ] },
  { title: "Everyday Clues", questions: [
    question("Which object helps keep you dry in rain?", "You can hold it over your head.", ["Umbrella", "Sunglasses", "Pillow"], "Umbrella"),
    question("What can you read?", "It has pages and a cover.", ["Book", "Spoon", "Shoe"], "Book"),
    question("What happens to ice in a warm room?", "It changes from solid to liquid.", ["It melts", "It grows", "It turns into sand"], "It melts"),
  ] },
  { title: "Double Dash", questions: [
    question("What comes next? 2, 4, 8, …", "Each number is doubled.", ["10", "12", "16"], "16"),
    question("Which is the biggest number?", "Compare the number of tens first.", ["28", "32", "23"], "32"),
    question("Two pairs of shoes make how many shoes?", "A pair has two.", ["2", "4", "6"], "4"),
  ] },
  { title: "Growing Garden", questions: [
    question("What comes next? 1, 3, 5, …", "Skip one number each time.", ["6", "7", "8"], "7"),
    question("Continue the pattern: circle, triangle, square, circle, triangle, …", "The same three shapes repeat.", ["Circle", "Square", "Triangle"], "Square"),
    question("Which grows from a seed?", "It can have roots, leaves, and flowers.", ["Plant", "Cloud", "Spoon"], "Plant"),
  ] },
  { title: "Time & Teamwork", questions: [
    question("It is 7 o'clock. What time is three hours later?", "Move forward three hours.", ["9 o'clock", "10 o'clock", "11 o'clock"], "10 o'clock"),
    question("Four friends each have one apple. How many apples altogether?", "Count one apple for each friend.", ["3", "4", "5"], "4"),
    question("Which tool helps you see faraway stars?", "People point it toward the night sky.", ["Telescope", "Toaster", "Ruler"], "Telescope"),
  ] },
  { title: "Nature Detectives", questions: [
    question("What can a caterpillar become?", "It changes as it grows.", ["Butterfly", "Frog", "Robin"], "Butterfly"),
    question("Which helps most seeds begin to grow?", "Think of what a seed needs from the soil and sky.", ["Water", "Plastic", "A shoe"], "Water"),
    question("Which one is not an animal?", "Look for the thing that is a plant.", ["Fox", "Fern", "Frog"], "Fern"),
  ] },
  { title: "Curious Counts", questions: [
    question("What is 3 + 4?", "Start at three and count four more.", ["6", "7", "8"], "7"),
    question("Twelve berries are shared equally between two bowls. How many go in each?", "Split twelve into two equal groups.", ["5", "6", "7"], "6"),
    question("What comes next? 2, 5, 8, …", "Add three each time.", ["10", "11", "12"], "11"),
  ] },
  { title: "Twisty Patterns", questions: [
    question("What comes next? 1, 4, 7, 10, …", "Add three to each number.", ["12", "13", "14"], "13"),
    question("Continue the pattern: moon, star, moon, star, …", "The two pictures alternate.", ["Moon", "Sun", "Star"], "Moon"),
    question("A basket has 3 red balls and 1 green ball. Which color has more?", "Compare the groups.", ["Red", "Green", "They are equal"], "Red"),
  ] },
  { title: "Puzzle Champion", questions: [
    question("Follow the countdown: 8, 6, 4, …", "Take away two each time.", ["1", "2", "3"], "2"),
    question("Which pair makes 10?", "Add the two numbers together.", ["4 and 5", "6 and 4", "3 and 8"], "6 and 4"),
    question("A shape has no corners and one curved edge. Which is it?", "You can roll it across a table.", ["Circle", "Square", "Triangle"], "Circle"),
  ] },
];

export const shuffleClueQuestions = (items) => {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled;
};
