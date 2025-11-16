/**
 * AI Service for generating upcycling ideas
 * For now, using rule-based generation
 * Can be extended to integrate with OpenAI API or other AI services
 */

const ideaTemplates = {
  'plastic bottles': [
    'You can turn your plastic bottles into a beautiful DIY vertical garden or a self-watering planter for your home herbs. Use the bottle caps to create a mosaic.',
    'Transform plastic bottles into creative storage containers, bird feeders, or even a chandelier for your home.',
    'Create a plastic bottle greenhouse or use them as planters for a sustainable garden project.',
  ],
  'cardboard': [
    'A simple way to upcycle an old cardboard box into a desk organizer or storage solution.',
    'Transform cardboard into creative wall art, furniture, or children\'s play structures.',
    'Use cardboard to create custom packaging, gift boxes, or home decor items.',
  ],
  'glass jars': [
    'Make cozy and eco-friendly candle holders from old jars, or use them as storage containers.',
    'Transform glass jars into beautiful terrariums, vases, or kitchen storage solutions.',
    'Create a DIY lamp or lantern using glass jars for a unique home decoration.',
  ],
  'fabric': [
    'A simple, no-sew project to turn an old shirt into a tote bag or pillow cover.',
    'Repurpose old jeans into a stylish wallet, bag, or home decor items.',
    'Transform fabric scraps into quilts, rugs, or creative art projects.',
  ],
  'metal cans': [
    'Give old tin cans a new purpose in your kitchen or garden as herb planters or storage.',
    'Transform metal cans into creative organizers, pencil holders, or decorative items.',
    'Use tin cans to create wind chimes, lanterns, or garden markers.',
  ],
};

export const generateIdea = (material) => {
  const materialLower = material.toLowerCase();
  
  // Check if we have templates for this material
  for (const [key, ideas] of Object.entries(ideaTemplates)) {
    if (materialLower.includes(key.split(' ')[0])) {
      const randomIdea = ideas[Math.floor(Math.random() * ideas.length)];
      return randomIdea;
    }
  }
  
  // Default response if material not found
  return `Get creative with your ${material}! There are many ways to upcycle this material into something useful and beautiful. Start by cleaning it thoroughly and thinking about what function you need in your home or garden.`;
};

