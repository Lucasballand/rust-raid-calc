window.RUST = {
  gunpowder: { sulfur: 2, charcoal: 3 },
  explosive: { gunpowder: 50, sulfur: 10, lowgrade: 3, metalfrags: 10 },

  items: [
    { id: "rocket", name: "Roquette", unit: "roquettes", img: "assets/items/rocket.png", recipe: { explosives: 10, gunpowder: 150, pipes: 2 } },
    { id: "c4", name: "C4", unit: "C4", img: "assets/items/timed_charges.png", recipe: { explosives: 20, cloth: 5, techtrash: 2 } },
    { id: "explo556", name: "Balles explo 5.56", unit: "balles", output: 2, img: "assets/items/explo556.png", recipe: { gunpowder: 20, sulfur: 10, metalfrags: 10 } },
    { id: "beancan", name: "Beancan", unit: "beancans", img: "assets/items/beancan.png", recipe: { gunpowder: 60, metalfrags: 20 } },
    { id: "satchel", name: "Satchel", unit: "satchels", img: "assets/items/satchel.png", recipe: { beancan: 4, rope: 1, smallstash: 1 } },
    { id: "f1", name: "F1 Grenade", unit: "grenades", img: "assets/items/f1.png", recipe: { gunpowder: 30, metalfrags: 25 } }
  ],

  /**
   * DECAY (vanilla)
   * - decayHours = durée pour partir de 100% → 0% (si la decay est active).
   * - maxHp dépend du type de pièce (bloc vs portes/hatches).
   */
  decay: {
    materials: {
      twig: { id: "twig", label: "Twig", decayHours: 1 },
      wood: { id: "wood", label: "Bois", decayHours: 3 },
      stone: { id: "stone", label: "Pierre", decayHours: 5 },
      metal: { id: "metal", label: "Métal", decayHours: 8 },
      hqm: { id: "hqm", label: "HQM", decayHours: 12 },
    },

    pieces: [
      {
        id: "block",
        label: "Bloc (mur / fondation / plancher / toit…)",
        // En vanilla, les building blocks partagent le même HP par grade.
        maxHpByMat: { twig: 10, wood: 250, stone: 500, metal: 1000, hqm: 2000 },
        defaultMat: "stone",
      },

      {
        id: "door_single",
        label: "Porte simple",
        // Wooden Door 200, Sheet Metal Door 250, Armored Door 1000
        maxHpByMat: { wood: 200, metal: 250, hqm: 1000 },
        defaultMat: "metal",
      },

      {
        id: "door_double",
        label: "Double porte",
        // Wood Double Door 200, Sheet Metal Double Door 250, Armored Double Door 1000
        maxHpByMat: { wood: 200, metal: 250, hqm: 1000 },
        defaultMat: "metal",
      },

      {
        id: "garage_door",
        label: "Garage door",
        // Garage Door 600 HP, decay = métal (8h)
        maxHpByMat: { metal: 600 },
        defaultMat: "metal",
      },

      {
        id: "ladder_hatch",
        label: "Ladder hatch",
        // Ladder Hatch 250 HP, decay = métal (8h)
        maxHpByMat: { metal: 250 },
        defaultMat: "metal",
      },

      {
        id: "triangle_ladder_hatch",
        label: "Triangle ladder hatch",
        // Triangle Ladder Hatch 250 HP, decay = métal (8h)
        maxHpByMat: { metal: 250 },
        defaultMat: "metal",
      },
    ],
  }
};

