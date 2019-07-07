using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class schachbrett : MonoBehaviour
{
    public GameObject [,] brettArray;
    // Start is called before the first frame update
    void Start()
    {
        brettArray = new GameObject[7,7];
    }

    // Update is called once per frame
    void Update()
    {
        
    }
}
