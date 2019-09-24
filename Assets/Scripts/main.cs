using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class main : MonoBehaviour
{
    public int phase;
    public int cash;
    public int maxphase = 2;
    public int winstreak;

    public schachbrett schachbrett1;

    // Start is called before the first frame update
    void Start()
    {
        cash = 1;
        phase = 1;
        winstreak = 0;
    }

    public void nextPhase(bool win)
    {
        if(maxphase == phase)
        {
            phase = 1;
            getReward(win);
        }
        else
        {
            phase++;
        }
        
    }

    public void getReward(bool win)
    {
        if (win)
        {
            winstreak++;
            cash++;
            if (winstreak > 5)
            {
                cash++;
            }
        }
        else
        {
            winstreak = 0;
        }
    }

    // Update is called once per frame
    void Update()
    {
        if (Input.GetKeyDown("space"))
        {
            print("space key was pressed");
            foreach(schachfeld f in schachbrett1.brettArray)
            {
            }
            nextPhase(true);
        }
        if (Input.GetKeyDown("d"))
        {


        }
       

        switch (phase)
        {
            case 0:

                break;
            case 1:

                break;
            case 2:

                break;
            case 3:

                break;
        }
    }
}
