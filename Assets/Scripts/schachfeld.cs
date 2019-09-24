using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class schachfeld : MonoBehaviour
{
    public int x;
    public int y;
    public AI onField;
    public schachbrett brett;
    public bool selected;
    public bool changed;
    public 
    // Start is called before the first frame update
    void Start()
    {
        onField = null;
        selected = false;
        changed = true;
    }

    // Update is called once per frame
    void Update()
    {
        if(selected && changed)
        {
            changed = false;
            transform.position = new Vector3(transform.position.x, 0.2f, transform.position.z);
        }
        else if(!selected && !changed)
        {
            changed = true;
            transform.position = new Vector3(transform.position.x, 0, transform.position.z);
        }
    }

}
