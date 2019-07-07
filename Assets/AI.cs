using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

public class AI : MonoBehaviour
{
    float timeLeft;
    float cooldown;
    public int maxhealth;
    public int health;
    int damage;
    public enemies enemielist;
    public team teamlist;
    public AI enemie;
    public healthbar healthbar1;
    public main phase;
    public bool doesattack;
    public bool isenemy;
    // Start is called before the first frame update
    void Start()
    {
        maxhealth = 100;
        health = maxhealth;
        damage = 10;
        timeLeft = 2.0f;
        cooldown = timeLeft;
        if (isenemy)
        {
            enemielist.enemielist.Add(this);
        }
        else
        {
            teamlist.teamlist.Add(this);
        }
        
        healthbar1.updateText();
        doesattack = false;
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
                performAttack();
                break;
        }

        
    }

    public void performAttack()
    {
        timeLeft -= Time.deltaTime;
        if (timeLeft < 0)
        {
            attack(enemie);
            timeLeft = Random.Range(cooldown - 1, cooldown + 1);
        }
    }

    public AI findEnemy()
    {
        if(isenemy)
        {
            foreach (AI target in teamlist.teamlist) {
                enemie = target;
            }
        }
        else
        {
            foreach (AI target in enemielist.enemielist)
            {
                enemie = target;
            }
        }
        return enemie;
    }

    public void attack(AI enemie)
    {
        if(enemie != null)
        {
            doesattack = true;
            if ((enemie.health -= Random.Range(damage - 2, damage + 2)) <= 0)
            {
                if(isenemy)
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
            
        }
        
    }

    public void respawn()
    {
        health = maxhealth;
        //healthbar1.updateText();
    }
}
