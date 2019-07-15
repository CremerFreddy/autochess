using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class schachfeld : MonoBehaviour
{
    public int x;
    public int y;
    public bool locked;
    public AI onField;
    public schachbrett brett;
    // Start is called before the first frame update
    void Start()
    {
        locked = false;
        onField = null;
    }

    // Update is called once per frame
    void Update()
    {
        
    }

    public void lockField(bool ok)
    {
        locked = ok;
    }
}
