using System.Collections;
using System.Collections.Generic;
using UnityEngine;
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

    public bool lockMovement; // wird gelockt solange unit sich von einem zum anderen feld bewegt
    // Start is called before the first frame update
    void Start()
    {
        evaluate = false;
        maxhealth = myUnit.health;
        health = maxhealth;
        damage = myUnit.attack;
        speed = myUnit.speed;
        range = myUnit.range;
        timeLeft = 10 - myUnit.attackspeed;
        cooldown = timeLeft;
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
            feld.locked = false;
            Destroy(this.gameObject);
            respawn();
        }
        if (enemie == null)
        {
            enemie = findEnemy();
        }
        
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
                    findEnemy();
                }
                performAttack();
                doMovement();
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

    public int calcRange(AI g)
    {
        int x1, y1, x2, y2, x3, y3;

        int a = g.feld.x;
        int b = g.feld.y;
        int c = feld.x;
        int d = feld.y;
        x1 = (a > c) ? a : c;
        x2 = (a < c) ? a : c;
        y1 = (b > d) ? b : d;
        y2 = (b < d) ? b : d;
        x3 = x1 - x2;
        y3 = y1 - y2;

        if(x3 > y3)
        {
            return x3;
        }
        else
        {
            return y3;
        }
    }
    public AI findEnemy()
    {
        updateOpponentList();
        int rangeto = 200;
        AI target = null;
        foreach(AI g in opponentList)
        {
            if (calcRange(g) < rangeto)
            {
                rangeto = calcRange(g);
                target = g;
            }
        }
        //Debug.Log(calcRange(target));
        return target;
    }


    public void moveToTarget()
    {
        // Distance moved = time * speed.
        float distCovered = (Time.time - starttime) * speed;

        // Fraction of journey completed = current distance divided by total distance.
        float fracJourney = distCovered / journylength;

        transform.position = Vector3.Lerp(startpoint, endpoint, fracJourney);
        if(fracJourney > 1)
        {
            if (targetFeld != null)
            {
                feld.locked = false;
                feld = targetFeld;
                
            }
            
            findEnemy();
            starttime = Time.time;
            
        }
           // targetFeld.transform.position;
    }

    public void setTargetField(schachfeld target)
    {
        
        targetFeld = target;
        targetFeld.locked = true;
        starttime = Time.time;
        startpoint = new Vector3(feld.transform.position.x, 1, feld.transform.position.z);
        endpoint = new Vector3(targetFeld.transform.position.x, 1, targetFeld.transform.position.z);
        journylength = Vector3.Distance(startpoint, endpoint);
    }

    public void doMovement()
    {
        if(targetFeld != feld && targetFeld != null)
        {
            moveToTarget();
        }
    }


    public void attack(AI enemie)
    {
        if(enemie != null)
        {
            if(schachbrett.getRange(feld.x,feld.y,enemie.feld.x, enemie.feld.y) > range)
            {
                if  (feld == targetFeld)
                {
                    int calcnextfieldx;
                    int calcnextfieldy;
                    bool keepsearching = true; //solange suchen , true und wird bei gefundenem target false gesetze;
                                               //while(keepsearching)
                   // while(keepsearching)
                    //{
                        if (feld.x < enemie.feld.x)
                        {
                            calcnextfieldx = feld.x + 1;
                            if(schachbrett.brettArray[calcnextfieldx, feld.y].locked)
                            {
                                calcnextfieldx -= 1;
                            }
                        }
                        else if (feld.x > enemie.feld.x)
                        {
                            calcnextfieldx = feld.x - 1;
                            if (schachbrett.brettArray[calcnextfieldx, feld.y].locked)
                            {
                                calcnextfieldx += 1;
                            }
                        }
                        else
                        {
                            calcnextfieldx = feld.x;
                        }

                        if (feld.y < enemie.feld.y)
                        {
                            calcnextfieldy = feld.y + 1;
                            if (schachbrett.brettArray[calcnextfieldx, calcnextfieldy].locked)
                            {
                                calcnextfieldy -= 1;
                            }
                        }
                        else if (feld.y > enemie.feld.y)
                        {
                            calcnextfieldy = feld.y - 1;
                            if (schachbrett.brettArray[calcnextfieldx, calcnextfieldy].locked)
                            {
                                calcnextfieldy += 1;
                            }
                        }
                        else
                        {
                            calcnextfieldy = feld.y;
                        }
                        if (schachbrett.brettArray[calcnextfieldx, calcnextfieldy].locked == false)
                        {
                            setTargetField(schachbrett.brettArray[calcnextfieldx, calcnextfieldy]);
                            keepsearching = false;
                        }
                    //}
                    
                }
           
                
            }
            else
            {
                timeLeft -= Time.deltaTime;
                if (timeLeft < 0)
                {
                    doesattack = true;
                    if ((enemie.health -= Random.Range(damage - 2, damage + 2)) <= 0)
                    {
                        if (isenemy)
                        {
                            if (teamlist.teamlist.Count == 0)
                            {
                                healthbar1.textfield.text = "WIN";
                                enemie.healthbar1.textfield.text = "LOSE";
                                phase.nextPhase(true);
                            }
                        }
                    }
                    else
                    {
                        enemie.healthbar1.updateText();
                    }
                    timeLeft = cooldown;
                }
                
            }
            
            
        }
        
    }

    public void respawn()
    {
        health = maxhealth;
        //healthbar1.updateText();
    }
}
