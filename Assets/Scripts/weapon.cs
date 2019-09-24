using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class weapon : MonoBehaviour
{
    public AI myai;
    // Start is called before the first frame update
    void Start()
    {
        
    }

    // Update is called once per frame
    void Update()
    {
        if (myai.doesattack)
        {
            float step = 20 * Time.deltaTime;
            if(myai.enemie == null)
            {
                transform.position = myai.transform.position;
            }
            else
            {
                transform.position = Vector3.MoveTowards(transform.position, myai.enemie.transform.position, step);
                if (transform.position == myai.enemie.transform.position)
                {
                    myai.doesattack = false;
                    transform.position = myai.transform.position;

                }
            }
    
           
        }
    }
}
