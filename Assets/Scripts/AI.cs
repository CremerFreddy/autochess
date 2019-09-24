using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.AI;
using UnityEngine.UI;


public class AI : MonoBehaviour
{
    public Unit myUnit; //scriptable object von welchem werte übernommen werden
    public int maxhealth; //stat wird von myUnit abgefragt
    int damage; //stat wird von myUnit abgefragt
    float speed;
    float range;

    public int health; //aktuelle leben 
    float cooldown; // cooldown(timeleft wird auf cooldown gesetzt nach attack)
    float timeLeft; //countdown für nächsten angriff
    public bool evaluate; //check ob unit feld neu analysieren soll
    public bool doesattack; // greift unit momentan an?
    public bool isenemy; //gehört unit zu gegner oder team?
    private float starttime;
    private float journylength;

    public enemies enemielist; // gegnerliste
    public team teamlist; //teamliste
    public List<AI> opponentList; //liste des gegnerteams
    public AI enemie; //aktuelles target
    public healthbar healthbar1; //healthbar klasse
    public main phase; //unit macht sachen je nachdem welche phase aktuell ist(bsp. aufwerten nur in manage phase, angreifen in fight phase)
    public schachfeld feld; //aktuelles feld auf dem unit steht
    public schachfeld targetFeld; //target feld zum hinmoven
    public Vector3 startpoint;
    public Vector3 endpoint;
    public schachbrett schachbrett;
    public List<weg> wegliste;
    public NavMeshAgent agent;

    public bool lockMovement; // wird gelockt solange unit sich von einem zum anderen feld bewegt
    // Start is called before the first frame update
    void Start()
    {
        evaluate = false;

        //werte übernehmen von myUnit
        maxhealth = myUnit.health;
        health = maxhealth;
        damage = myUnit.attack;
        speed = myUnit.speed;
        range = myUnit.range;
        timeLeft = 10 - myUnit.attackspeed;


        cooldown = timeLeft;

        //je nachdem wem die einheit gehört in liste einordnen
        if (isenemy)
        {
            enemielist.enemielist.Add(this);
        }
        else
        {
            teamlist.teamlist.Add(this);
        }
        updateOpponentList();

        healthbar1.updateText();
        doesattack = false;


        schachbrett = feld.brett;
        targetFeld = feld;
        

    }

    // Update is called once per frame
    void Update()
    {

        //wenn leben unter 0 fallen von liste entfernen
        if(health<=0)
        {
            if(isenemy)
            {
                enemielist.enemielist.Remove(this);
                if(enemielist.enemielist.Count == 0)
                {
                    phase.nextPhase(true);
                }
            }
            else
            {
                
                teamlist.teamlist.Remove(this);
                if (teamlist.teamlist.Count == 0)
                {
                    phase.nextPhase(false);
                }
            }
            Destroy(this.gameObject);
            respawn();
        }
        

        //je nachdem welche phase ist aktionen ausführen
        switch (phase.phase)
        {
            case 0:
                break;
            case 1:
                
                break;
            case 2:
                if(evaluate)
                {
                    evaluate = false;
                    //findEnemy();
                }
                performAttack();
                break;
        }

        
    }

    public void performAttack()
    {
      
            attack(enemie);
         
    }

    public void searchWege()
    {
        List<schachfeld> feldlist = new List<schachfeld>(); //weg
        List<weg> wegliste = new List<weg>(); // wegliste
        List<weg> finalweg =  Astar(wegliste);
        
        //wegfindungsalgorithmus schreiben

        weg weg1 = new weg(feldlist);
        wegliste.Add(weg1);
    }

    public List<weg> Astar(List<weg> wegliste)
    {
        return new List<weg>();
    }


    public void updateOpponentList()
    {
        if(isenemy)
        {
            opponentList = teamlist.teamlist;
        }
        else
        {
            opponentList = enemielist.enemielist;
        }
    } 


    public void attack(AI enemie)
    {
        
        
    }

    public void respawn()
    {
        health = maxhealth;
        //healthbar1.updateText();
    }
}
