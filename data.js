/* data.js — Rust Raid Calc */
window.RUST = {
  gunpowder: { sulfur: 2, charcoal: 3 },
  explosive: { gunpowder: 50, sulfur: 10, lowgrade: 3, metalfrags: 10 },

  items: [
    {
      id: "rocket",
      name: "Roquette",
      unit: "roquettes",
      img: "assets/items/rocket.png",
      recipe: { explosives: 10, gunpowder: 150, pipes: 2 }
    },
    {
      id: "c4",
      name: "C4",
      unit: "C4",
      img: "assets/items/timed_charges.png",
      recipe: { explosives: 20, cloth: 5, techtrash: 2 }
    },
    {
      id: "explo556",
      name: "Balles explo 5.56",
      unit: "balles",
      output: 2,
      img: "assets/items/explo556.png",
      recipe: { gunpowder: 20, sulfur: 10, metalfrags: 10 }
    },
    {
      id: "beancan",
      name: "Beancan",
      unit: "beancans",
      img: "assets/items/beancan.png",
      recipe: { gunpowder: 60, metalfrags: 20 }
    },
    {
      id: "satchel",
      name: "Satchel",
      unit: "satchels",
      img: "assets/items/satchel.png",
      recipe: { beancan: 4, rope: 1, smallstash: 1 }
    },
    {
      id: "f1",
      name: "F1 Grenade",
      unit: "grenades",
      img: "assets/items/f1.png",
      recipe: { gunpowder: 30, metalfrags: 25 }
    }
  ],

  decay: {
    materials: {
      twig: { id: "twig", label: "Twig", decayHours: 1 },
      wood: { id: "wood", label: "Bois", decayHours: 3 },
      stone: { id: "stone", label: "Pierre", decayHours: 5 },
      metal: { id: "metal", label: "Métal", decayHours: 8 },
      hqm: { id: "hqm", label: "HQM", decayHours: 12 }
    },

    pieces: [
      {
        id: "block",
        label: "Bloc (mur / fondation / plancher / toit…)",
        maxHpByMat: { twig: 10, wood: 250, stone: 500, metal: 1000, hqm: 2000 },
        defaultMat: "stone"
      },
      {
        id: "door_single",
        label: "Porte simple",
        maxHpByMat: { wood: 200, metal: 250, hqm: 1000 },
        defaultMat: "metal"
      },
      {
        id: "door_double",
        label: "Double porte",
        maxHpByMat: { wood: 200, metal: 250, hqm: 1000 },
        defaultMat: "metal"
      },
      {
        id: "garage_door",
        label: "Garage door",
        maxHpByMat: { metal: 600 },
        defaultMat: "metal"
      },
      {
        id: "ladder_hatch",
        label: "Ladder hatch",
        maxHpByMat: { metal: 250 },
        defaultMat: "metal"
      },
      {
        id: "triangle_ladder_hatch",
        label: "Triangle ladder hatch",
        maxHpByMat: { metal: 250 },
        defaultMat: "metal"
      }
    ]
  },

  raid: {
    targets: [
      {
        id: "sheet_door",
        label: "Sheet Metal Door (simple/double)",
        cat: "doors",
        hp: 250,
        img: "assets/items/sheet_door.png",
        options: [
          { label: "2 Rockets", parts: [{ item: "rocket", qty: 2 }] },
          { label: "1 C4", parts: [{ item: "c4", qty: 1 }] },
          { label: "1 Rocket + 8 Explo", parts: [{ item: "rocket", qty: 1 }, { item: "explo556", qty: 8 }] }
        ],
      },
      {
        id: "garage_door",
        label: "Garage Door",
        cat: "doors",
        hp: 600,
        img: "assets/items/garage_door.png",
        options: [
          { label: "3 Rockets", parts: [{ item: "rocket", qty: 3 }] },
          { label: "2 C4", parts: [{ item: "c4", qty: 2 }] },
          { label: "150 Explo", parts: [{ item: "explo556", qty: 150 }] },
          { label: "9 Satchels", parts: [{ item: "satchel", qty: 9 }] },
          { label: "1 Rocket + 1 C4", parts: [{ item: "rocket", qty: 1 }, { item: "c4", qty: 1 }] }
        ],
      },
      {
        id: "armored_door",
        label: "Armored Door (single/double)",
        cat: "doors",
        hp: 1000,
        img: "assets/items/armored_door.png",
        options: [
          { label: "5 Rockets", parts: [{ item: "rocket", qty: 5 }] },
          { label: "3 C4", parts: [{ item: "c4", qty: 3 }] },
          { label: "250 Explo", parts: [{ item: "explo556", qty: 250 }] },
          { label: "2 C4 + 35 Explo", parts: [{ item: "c4", qty: 2 }, { item: "explo556", qty: 35 }] }
        ],
      },
      {
        id: "stone_wall",
        label: "Stone Wall",
        cat: "walls",
        hp: 500,
        img: "assets/items/stone_wall.png",
        options: [
          { label: "4 Rockets", parts: [{ item: "rocket", qty: 4 }] },
          { label: "2 C4", parts: [{ item: "c4", qty: 2 }] },
          { label: "185 Explo", parts: [{ item: "explo556", qty: 185 }] }
        ],
      },
      {
        id: "metal_wall",
        label: "Sheet Metal Wall",
        cat: "walls",
        hp: 1000,
        img: "assets/items/metal_wall.png",
        options: [
          { label: "8 Rockets", parts: [{ item: "rocket", qty: 8 }] },
          { label: "4 C4", parts: [{ item: "c4", qty: 4 }] },
          { label: "400 Explo", parts: [{ item: "explo556", qty: 400 }] }
        ],
      },
      {
        id: "hqm_wall",
        label: "Armored Wall (HQM)",
        cat: "walls",
        hp: 2000,
        img: "assets/items/hqm_wall.png",
        options: [
          { label: "15 Rockets", parts: [{ item: "rocket", qty: 15 }] },
          { label: "8 C4", parts: [{ item: "c4", qty: 8 }] },
          { label: "799 Explo", parts: [{ item: "explo556", qty: 799 }] }
        ],
      }
    ],
  },

};
