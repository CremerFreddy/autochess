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

    //units
    public GameObject myPrefab;
    public GameObject myEnemiePrefab;

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
            nextPhase(true);
        }
        if (Input.GetKeyDown("d"))
        {


        }
        if (Input.GetMouseButtonDown(0))
        {
            RaycastHit hit;
            var ray = Camera.main.ScreenPointToRay(Input.mousePosition);

            if (Physics.Raycast(ray, out hit))
            {
                //hit.rigidbody.AddForceAtPosition(ray.direction * pokeForce, hit.point);
                // This script will simply instantiate the Prefab when the game starts.
                // Instantiate at position (0, 0, 0) and zero rotation.
                int pos1 = (int)Math.Round(hit.point.x, 0);
                int pos2 = (int)Math.Round(hit.point.z, 0);
                if(schachbrett1.brettArray[pos1, pos2] == null && pos1 <= 8 && pos2 <=3)
                {
                    GameObject obj = Instantiate(myPrefab, new Vector3(pos1, 1, pos2), Quaternion.identity);
                    obj.GetComponent<AI>().enemielist = gameObject.GetComponent<enemies>();
                    obj.GetComponent<AI>().teamlist = gameObject.GetComponent<team>();
                    obj.GetComponent<AI>().phase = gameObject.GetComponent<main>();
                    schachbrett1.brettArray[pos1, pos2] = obj;
                }
                
            }
        }

        if (Input.GetMouseButtonDown(1))
        {
            RaycastHit hit;
            var ray = Camera.main.ScreenPointToRay(Input.mousePosition);

            if (Physics.Raycast(ray, out hit))
            {

                int pos1 = (int)Math.Round(hit.point.x, 0);
                int pos2 = (int)Math.Round(hit.point.z, 0);
                if (schachbrett1.brettArray[pos1, pos2] == null)
                {
                    GameObject obj = Instantiate(myEnemiePrefab,new Vector3(pos1, 1, pos2), Quaternion.identity);
                    obj.GetComponent<AI>().enemielist = gameObject.GetComponent<enemies>();
                    obj.GetComponent<AI>().teamlist = gameObject.GetComponent<team>();
                    obj.GetComponent<AI>().phase = gameObject.GetComponent<main>();
                    schachbrett1.brettArray[pos1, pos2] = obj;
                }
            }
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
