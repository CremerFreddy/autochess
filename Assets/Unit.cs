using System.Collections;
using System.Collections.Generic;
using UnityEngine;

[CreateAssetMenu(fileName = "Unit", menuName = "AI", order = 1)]
public class Unit : ScriptableObject
{
    public int ID = 0;
    public int health = 50;
    public int range = 10;
    public int attack = 20;
    public float attackspeed = 10f;
    // Start is called before the first frame update
    void Start()
    {
        
    }

    // Update is called once per frame
    void Update()
    {
        
    }
}
